import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
  mobileOnly?: boolean; // Only send to mobile devices
}

// Check if user agent is from an Android device
function isAndroidDevice(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return userAgent.includes('Android');
}

// Get Google OAuth2 access token from service account
async function getAccessToken(): Promise<string> {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  }

  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  
  // Create JWT header and payload
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    console.error("Token response:", tokenData);
    throw new Error("Failed to get access token");
  }

  return tokenData.access_token;
}

// Send FCM message using HTTP v1 API - DATA ONLY payload for reliable SW handling
async function sendFCMMessage(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT!);
    const projectId = serviceAccount.project_id;

    // Use DATA-ONLY message - no notification field
    // This ensures the Service Worker always handles and displays the notification
    const message = {
      message: {
        token,
        data: {
          title,
          body,
          tag: data?.tag || 'vs-reservation',
          url: data?.url || '/control',
          icon: '/vs-logo.png',
          badge: '/vs-logo.png',
          ...(data || {})
        },
        webpush: {
          headers: {
            Urgency: 'high',
            TTL: '86400'
          }
        },
        android: {
          priority: 'high'
        }
      }
    };

    console.log("Sending FCM message:", JSON.stringify(message, null, 2));

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
      }
    );

    const result = await response.json();
    
    if (!response.ok) {
      console.error("FCM error:", result);
      return false;
    }

    console.log("FCM message sent:", result);
    return true;
  } catch (error) {
    console.error("Error sending FCM message:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, data, mobileOnly = true }: PushNotificationRequest = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all FCM tokens with user_agent
    const { data: tokens, error } = await supabase
      .from("fcm_tokens")
      .select("token, user_agent");

    if (error) {
      console.error("Error fetching tokens:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("No FCM tokens found");
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Filter tokens - only Android devices by default
    const filteredTokens = mobileOnly 
      ? tokens.filter(t => isAndroidDevice(t.user_agent))
      : tokens;

    console.log(`Total tokens: ${tokens.length}, Mobile tokens: ${filteredTokens.length}, mobileOnly: ${mobileOnly}`);

    if (filteredTokens.length === 0) {
      console.log("No mobile tokens found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No mobile devices registered" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending push to ${filteredTokens.length} mobile device(s)`);

    // Send to filtered tokens
    let successCount = 0;
    const invalidTokens: string[] = [];

    for (const { token } of filteredTokens) {
      const success = await sendFCMMessage(token, title, body, data);
      if (success) {
        successCount++;
      } else {
        invalidTokens.push(token);
      }
    }

    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      await supabase
        .from("fcm_tokens")
        .delete()
        .in("token", invalidTokens);
      console.log(`Removed ${invalidTokens.length} invalid tokens`);
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: invalidTokens.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
