'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

/*
 * Glass toasts and confirm dialogs (shadcn "Sonner" + "AlertDialog" style).
 * Call toast.success(...) / await confirmDialog(...) from anywhere;
 * <FeedbackProvider /> (mounted once in the root layout) renders them.
 */

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
    id: number;
    kind: ToastKind;
    title: string;
    description?: string;
}

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    /** User must type this exact text before confirming (for dangerous actions) */
    requireText?: string;
}

let pushToast: ((t: Omit<ToastItem, 'id'>) => void) | null = null;
let openConfirm: ((o: ConfirmOptions, resolve: (ok: boolean) => void) => void) | null = null;

const emit = (kind: ToastKind) => (title: string, description?: string) => pushToast?.({ kind, title, description });

export const toast = {
    success: emit('success'),
    error: emit('error'),
    info: emit('info'),
    warning: emit('warning'),
};

export const confirmDialog = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
        if (!openConfirm) return resolve(window.confirm(options.title));
        openConfirm(options, resolve);
    });

const ICONS = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
};

export function FeedbackProvider() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [dialog, setDialog] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
    const [typed, setTyped] = useState('');
    const nextId = useRef(1);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

    useEffect(() => {
        pushToast = (t) => {
            const id = nextId.current++;
            setToasts((list) => [...list.slice(-3), { ...t, id }]);
            setTimeout(() => dismiss(id), t.kind === 'error' ? 6000 : 4000);
        };
        openConfirm = (options, resolve) => {
            setTyped('');
            setDialog({ options, resolve });
        };
        return () => {
            pushToast = null;
            openConfirm = null;
        };
    }, [dismiss]);

    const close = useCallback((ok: boolean) => {
        setDialog((current) => {
            current?.resolve(ok);
            return null;
        });
    }, []);

    // Focus the dialog and close it with Escape
    useEffect(() => {
        if (!dialog) return;
        (dialog.options.requireText ? inputRef.current : confirmRef.current)?.focus();
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dialog, close]);

    const canConfirm = !dialog?.options.requireText || typed === dialog.options.requireText;

    return (
        <>
            <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
                {toasts.map((t) => {
                    const Icon = ICONS[t.kind];
                    return (
                        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
                            <Icon size={18} className="toast-icon" />
                            <div className="toast-body">
                                <p className="toast-title">{t.title}</p>
                                {t.description && <p className="toast-description">{t.description}</p>}
                            </div>
                            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {dialog && (
                <div className="ui-overlay" onMouseDown={() => close(false)}>
                    <div
                        className="ui-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-title"
                        aria-describedby="confirm-description"
                        style={{ maxWidth: 440 }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <h3 id="confirm-title" className="ui-dialog-title">{dialog.options.title}</h3>
                        {dialog.options.description && (
                            <p id="confirm-description" className="ui-dialog-description">{dialog.options.description}</p>
                        )}
                        {dialog.options.requireText && (
                            <div className="input-group" style={{ margin: '1rem 0 0' }}>
                                <label>Type <strong style={{ margin: '0 0.25rem', color: 'var(--text)' }}>{dialog.options.requireText}</strong> to confirm</label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={typed}
                                    onChange={(e) => setTyped(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && canConfirm && close(true)}
                                />
                            </div>
                        )}
                        <div className="ui-dialog-footer">
                            <button className="btn btn-secondary" onClick={() => close(false)}>
                                {dialog.options.cancelText ?? 'Cancel'}
                            </button>
                            <button
                                ref={confirmRef}
                                className={`btn ${dialog.options.destructive ? 'btn-destructive' : 'btn-primary'}`}
                                disabled={!canConfirm}
                                onClick={() => close(true)}
                            >
                                {dialog.options.confirmText ?? 'Continue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
