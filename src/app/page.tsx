'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';

export default function SplashScreen() {
  const router = useRouter();
  const [showLogo, setShowLogo] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show logo after circles fuse (2.5 seconds)
    const logoTimer = setTimeout(() => {
      setShowLogo(true);
    }, 2500);

    // Start fade out at 4.5 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 4500);

    // Navigate to login after 5 seconds
    const navigateTimer = setTimeout(() => {
      router.push('/login');
    }, 5000);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(fadeTimer);
      clearTimeout(navigateTimer);
    };
  }, [router]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      
      position: 'relative',
      zIndex: 1,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.5s ease-out',
      overflow: 'hidden'
    }}>
      <style jsx>{`
                @keyframes orbitLeft {
                    0% {
                        transform: translateX(-350px) rotate(0deg);
                        opacity: 0.4;
                    }
                    25% {
                        transform: translateX(-100px) translateY(-150px) rotate(90deg);
                        opacity: 0.5;
                    }
                    50% {
                        transform: translateX(100px) translateY(-100px) rotate(180deg);
                        opacity: 0.6;
                    }
                    75% {
                        transform: translateX(50px) translateY(50px) rotate(270deg);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateX(0px) translateY(0px) rotate(360deg);
                        opacity: 1;
                    }
                }
                @keyframes orbitRight {
                    0% {
                        transform: translateX(350px) rotate(0deg);
                        opacity: 0.4;
                    }
                    25% {
                        transform: translateX(100px) translateY(150px) rotate(-90deg);
                        opacity: 0.5;
                    }
                    50% {
                        transform: translateX(-100px) translateY(100px) rotate(-180deg);
                        opacity: 0.6;
                    }
                    75% {
                        transform: translateX(-50px) translateY(-50px) rotate(-270deg);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateX(0px) translateY(0px) rotate(-360deg);
                        opacity: 1;
                    }
                }
                @keyframes logoReveal {
                    0% {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .circle-left {
                    position: absolute;
                    width: 140px;
                    height: 140px;
                    background: #242364;
                    border-radius: 50%;
                    animation: orbitLeft 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                .circle-right {
                    position: absolute;
                    width: 140px;
                    height: 140px;
                    background: #2d6a7a;
                    border-radius: 50%;
                    animation: orbitRight 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                .logo-reveal {
                    animation: logoReveal 0.5s ease-out forwards;
                }
            `}</style>

      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '350px',
        height: '350px'
      }}>
        {/* Big flat yellow circles with opacity, smooth orbit, fuse to solid */}
        {!showLogo && (
          <>
            <div className="circle-left"></div>
            <div className="circle-right"></div>
          </>
        )}

        {/* Logo appears after circles fuse */}
        {showLogo && (
          <div className="logo-reveal card" style={{ padding: '2rem 2.5rem', filter: 'drop-shadow(0 0 30px rgba(36, 35, 100, 0.15))' }}>
            <BrandLogo size="lg" />
          </div>
        )}
      </div>
    </div>
  );
}
