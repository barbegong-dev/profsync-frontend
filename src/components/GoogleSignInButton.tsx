'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GoogleCredentialResponse {
    credential: string;
}

interface GoogleIdentity {
    accounts: {
        id: {
            initialize: (config: { client_id: string; callback: (r: GoogleCredentialResponse) => void; ux_mode?: string }) => void;
            renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
    };
}

declare global {
    interface Window {
        google?: GoogleIdentity;
    }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

let scriptPromise: Promise<void> | null = null;

const loadGoogleScript = () => {
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            if (window.google?.accounts) return resolve();
            const script = document.createElement('script');
            script.src = SCRIPT_SRC;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                scriptPromise = null;
                reject(new Error('Could not load Google Sign-In'));
            };
            document.head.appendChild(script);
        });
    }
    return scriptPromise;
};

interface Props {
    onCredential: (credential: string) => void;
    text?: 'continue_with' | 'signin_with' | 'signup_with';
}

/**
 * Renders Google's official "Continue with Google" button and passes the ID token to onCredential.
 */
export default function GoogleSignInButton({ onCredential, text = 'continue_with' }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const callbackRef = useRef(onCredential);
    const [error, setError] = useState('');

    useEffect(() => {
        callbackRef.current = onCredential;
    }, [onCredential]);

    useEffect(() => {
        if (!CLIENT_ID) return;
        let cancelled = false;

        loadGoogleScript()
            .then(() => {
                if (cancelled || !ref.current || !window.google) return;
                window.google.accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: (response) => callbackRef.current(response.credential),
                });
                window.google.accounts.id.renderButton(ref.current, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text,
                    width: Math.min(ref.current.offsetWidth || 340, 400),
                    logo_alignment: 'center',
                });
            })
            .catch((e: Error) => setError(e.message));

        return () => {
            cancelled = true;
        };
    }, [text]);

    if (!CLIENT_ID) {
        return (
            <div className="notice notice-warning">
                Google sign-in is not configured yet. Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in <code>app/.env.local</code> and{' '}
                <code>GOOGLE_CLIENT_ID</code> in <code>api/.env</code> (see CREDENTIALS.md).
            </div>
        );
    }

    return (
        <div>
            <div ref={ref} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
            {error && <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</p>}
        </div>
    );
}
