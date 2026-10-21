import React from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'success' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: 'md' | 'sm' | 'icon';
    /** Shows a spinner and disables the button while an action runs */
    loading?: boolean;
    full?: boolean;
}

/** shadcn-style button on top of the app's .btn classes. */
export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    full = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
}: ButtonProps) {
    const classes = ['btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, full && 'btn-full', className]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {children}
        </button>
    );
}
