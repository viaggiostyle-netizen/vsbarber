import { useEffect, useState } from 'react';
import vsLogo from '@/assets/vs-logo.jpg';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 1.5 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1500);

    // Complete after fade animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo with animation */}
        <div className="animate-scale-in">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.15)]">
            <img 
              src={vsLogo} 
              alt="ViaggioStyle" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        {/* Text with fade in */}
        <div className="animate-fade-in text-center" style={{ animationDelay: '0.3s' }}>
          <h1 className="text-2xl font-bold text-white tracking-wider">VIAGGIOSTYLE</h1>
          <p className="text-sm text-white/60 mt-1">Panel de Control</p>
        </div>

        {/* Loading indicator */}
        <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
            <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
            <span className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
