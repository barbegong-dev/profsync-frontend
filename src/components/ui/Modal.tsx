'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    maxWidth?: number;
    /** Block closing (e.g. while saving) */
    locked?: boolean;
}

/** Glass dialog in the shadcn "Dialog" style. Closes on Escape or a click outside. */
export default function Modal({ open, onClose, title, description, children, maxWidth = 500, locked = false }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !locked && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, locked, onClose]);

    if (!open) return null;

    return (
        <div className="ui-overlay" onMouseDown={() => !locked && onClose()}>
            <div
                className="ui-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                style={{ maxWidth }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <button className="ui-dialog-close" onClick={onClose} disabled={locked} aria-label="Close">
                    <X size={18} />
                </button>
                <h3 id="modal-title" className="ui-dialog-title">{title}</h3>
                {description && <p className="ui-dialog-description">{description}</p>}
                <div style={{ marginTop: '1.25rem' }}>{children}</div>
            </div>
        </div>
    );
}
