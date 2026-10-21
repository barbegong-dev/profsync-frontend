import React, { useId } from 'react';

const SIZES = {
    sm: { icon: 30, text: '1.35rem' },
    md: { icon: 40, text: '1.85rem' },
    lg: { icon: 64, text: '3rem' },
};

interface BrandLogoProps {
    size?: keyof typeof SIZES;
    showText?: boolean;
}

// Transparent vector version of the ProfSync logo (sync arrows around stacked documents)
export const LogoMark: React.FC<{ size?: number }> = ({ size = 40 }) => {
    // Unique gradient id per instance: a shared id breaks when the first copy is display:none
    const gradId = `profsync-grad-${useId().replace(/:/g, '')}`;
    const grad = `url(#${gradId})`;
    return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#242364" />
                <stop offset="0.55" stopColor="#1f5f78" />
                <stop offset="1" stopColor="#2d8aa3" />
            </linearGradient>
        </defs>
        <g stroke={grad} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.03 18.19A17 17 0 0 1 39.97 18.19" />
            <path d="M42.03 12.13L39.97 18.19L34.51 14.85" />
            <path d="M39.97 29.81A17 17 0 0 1 8.03 29.81" />
            <path d="M5.97 35.87L8.03 29.81L13.49 33.15" />
        </g>
        <path d="M24 14.5L32.5 18.75L24 23L15.5 18.75Z" fill={grad} />
        <g stroke={grad} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 23.5L24 27.75L32.5 23.5" />
            <path d="M15.5 28.25L24 32.5L32.5 28.25" />
        </g>
    </svg>
    );
};

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showText = true }) => {
    const s = SIZES[size];
    return (
        <span className="brand-logo" aria-label="ProfSync">
            <LogoMark size={s.icon} />
            {showText && (
                <span className="brand-logo-text" style={{ fontSize: s.text }}>
                    ProfSync
                </span>
            )}
        </span>
    );
};

export default BrandLogo;
