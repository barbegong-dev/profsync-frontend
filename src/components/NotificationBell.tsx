'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api from '@/lib/api';

interface Notification {
    id: number;
    message: string;
    read: boolean;
    created_at: string;
}

const timeAgo = (iso: string) => {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString();
};

/** In-app notifications for every role: glass popover from the header bell. */
export default function NotificationBell() {
    const [items, setItems] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Not critical if it fails: the bell just keeps what it has
    const load = useCallback(() => {
        api.get('/api/notifications').then(res => setItems(res.data)).catch(() => {});
    }, []);

    // Load now and refresh every minute
    useEffect(() => {
        load();
        const timer = setInterval(load, 60_000);
        return () => clearInterval(timer);
    }, [load]);

    const toggle = () => {
        if (!open) load(); // fresh list whenever it opens
        setOpen(!open);
    };

    // Close on outside click or Escape
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onClick);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const unread = items.filter(n => !n.read);

    const markRead = async (n: Notification) => {
        if (n.read) return;
        setItems(list => list.map(i => (i.id === n.id ? { ...i, read: true } : i)));
        try {
            await api.put(`/api/notifications/${n.id}/read`);
        } catch {
            load();
        }
    };

    const markAllRead = async () => {
        const ids = unread.map(n => n.id);
        setItems(list => list.map(i => ({ ...i, read: true })));
        await Promise.allSettled(ids.map(id => api.put(`/api/notifications/${id}/read`)));
    };

    return (
        <div className="notif" ref={ref}>
            <button
                type="button"
                className="btn btn-secondary btn-icon notif-trigger"
                onClick={toggle}
                aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
                aria-expanded={open}
            >
                <Bell size={20} />
                {unread.length > 0 && <span className="notif-badge">{unread.length > 9 ? '9+' : unread.length}</span>}
            </button>

            {open && (
                <div className="notif-panel" role="dialog" aria-label="Notifications">
                    <div className="notif-header">
                        <strong>Notifications</strong>
                        {unread.length > 0 && (
                            <button type="button" className="link-btn" style={{ margin: 0 }} onClick={markAllRead}>
                                <CheckCheck size={14} /> Mark all read
                            </button>
                        )}
                    </div>
                    {items.length === 0 ? (
                        <p className="text-muted" style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                            You&apos;re all caught up.
                        </p>
                    ) : (
                        <ul className="notif-list">
                            {items.map(n => (
                                <li key={n.id}>
                                    <button type="button" className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => markRead(n)}>
                                        <span className="notif-dot" aria-hidden="true" />
                                        <span>
                                            <span className="notif-message">{n.message}</span>
                                            <span className="notif-time">{timeAgo(n.created_at)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
