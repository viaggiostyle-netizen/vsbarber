import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
  mobileOnly?: boolean;
}

// Check if user agent indicates a mobile device
function isMobileDevice(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return ua.includes('android') || ua.includes('iphone') || ua.includes('mobile');
}

// Get OAuth2 access token from Firebase service account
async function getAccessToken(): Promise<string> {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  }

  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  // Base64URL encode
  const b64url = (obj: unknown) => 
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  const headerB64 = b64url(header);
  const payloadB64 = b64url(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
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

  // Sign the token
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  
  if (!data.access_token) {
    console.error("Token error:", data);
    throw new Error("Failed to get access token");
  }

  return data.access_token;
}

// Send FCM message via HTTP v1 API
async function sendFCM(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT!);
    const projectId = serviceAccount.project_id;

    // FCM HTTP v1 API payload - icon/badge go in webpush.notification, not top-level notification
    const message = {
      message: {
        token,
        notification: {
          title,
          body
        },
        data: {
          tag: data?.tag || 'vs-notification',
          url: data?.url || '/control',
          icon: 'https://vsbarber.lovable.app/vs-icon-192.png',
          badge: 'https://vsbarber.lovable.app/vs-badge-96.png'
        },
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#D4AF37',
            click_action: 'OPEN_CONTROL'
          }
        },
        webpush: {
          headers: {
            Urgency: 'high',
            TTL: '86400'
          },
          notification: {
            icon: 'https://vsbarber.lovable.app/vs-icon-192.png',
            badge: 'https://vsbarber.lovable.app/vs-badge-96.png',
            requireInteraction: true
          }
        }
      }
    };

    console.log("Sending FCM to:", token.substring(0, 30) + "...");
    console.log("Message payload:", JSON.stringify(message, null, 2));

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
      console.error("FCM error response:", JSON.stringify(result, null, 2));
      console.error("FCM HTTP status:", response.status);
      return false;
    }

    console.log("FCM success:", result.name);
    return true;
  } catch (error) {
    console.error("FCM send error:", error);
    console.error("FCM error stack:", error instanceof Error ? error.stack : "No stack");
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, data, mobileOnly = true }: PushRequest = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all tokens
    const { data: tokens, error } = await supabase
      .from("fcm_tokens")
      .select("token, user_agent");

    if (error) {
      console.error("DB error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("No tokens found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No devices registered" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter tokens based on mobileOnly flag
    const targetTokens = mobileOnly 
      ? tokens.filter(t => isMobileDevice(t.user_agent))
      : tokens;

    console.log(`Tokens: ${tokens.length} total, ${targetTokens.length} targeted (mobileOnly: ${mobileOnly})`);

    if (targetTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: mobileOnly ? "No mobile devices" : "No devices" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to all targeted tokens
    let sent = 0;
    const failed: string[] = [];

    for (const { token } of targetTokens) {
      const success = await sendFCM(token, title, body, data);
      if (success) {
        sent++;
      } else {
        failed.push(token);
      }
    }

    // Clean up invalid tokens
    if (failed.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", failed);
      console.log(`Removed ${failed.length} invalid tokens`);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed: failed.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
