'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Check, Copy, ArrowRight, Building2, CalendarDays, ListChecks, Users, UserCheck } from 'lucide-react';

interface SetupStatus {
    tenant: { name: string; slug: string };
    departments: number;
    semesters: number;
    active_semester: string | null;
    requirements: number;
    members: number;
    pending: number;
    chairs: number;
}

export default function SetupGuide() {
    const [status, setStatus] = useState<SetupStatus | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        api.get('/api/admin/setup').then(res => setStatus(res.data)).catch(() => setStatus(null));
    }, []);

    if (!status) return <div>Loading setup guide...</div>;

    const signInLink = `${window.location.origin}/login?workspace=${status.tenant.slug}`;

    const steps = [
        {
            icon: Building2,
            title: 'Add your departments',
            body: 'Create every department or program, e.g. "Computer Science", "Information Technology", "Civil Engineering". Members are assigned to one of these.',
            done: status.departments > 0,
            detail: `${status.departments} added`,
            href: '/admin/departments',
            action: 'Manage departments',
        },
        {
            icon: CalendarDays,
            title: 'Create the current semester and mark it active',
            body: 'For example "1st Semester 2026-2027". Faculty only see requirements from the active semester.',
            done: !!status.active_semester,
            detail: status.active_semester ? `Active: ${status.active_semester}` : 'No active semester yet',
            href: '/admin/semesters',
            action: 'Manage semesters',
        },
        {
            icon: ListChecks,
            title: 'Add the documents faculty must submit',
            body: 'Typical requirements: Course Syllabus, Class Record, Table of Specifications (Midterm & Finals), Exam Questions, Grade Sheet. Set deadlines if needed.',
            done: status.requirements > 0,
            detail: `${status.requirements} in the active semester`,
            href: '/admin/requirements',
            action: 'Manage requirements',
        },
        {
            icon: Users,
            title: 'Invite your people',
            body: 'Share the sign-in link below. Everyone signs in with Google; new accounts wait for your approval. You can also add members by email ahead of time.',
            done: status.members > 0,
            detail: `${status.members} active member${status.members === 1 ? '' : 's'}`,
            href: '/admin/users',
            action: 'Manage members',
        },
        {
            icon: UserCheck,
            title: 'Approve sign-ups and assign roles',
            body: 'For each pending user pick a role (Faculty, Program Chair, Dean) and a department. Each department needs a Program Chair (up to two) to review submissions. Chairs can then add and manage the faculty of their own department.',
            done: status.pending === 0 && status.chairs > 0,
            detail: status.pending > 0 ? `${status.pending} waiting for approval` : `${status.chairs} program chair${status.chairs === 1 ? '' : 's'}`,
            href: '/admin/users',
            action: status.pending > 0 ? 'Review pending users' : 'Manage roles',
        },
    ];

    const doneCount = steps.filter(s => s.done).length;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(signInLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="dashboard-grid">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.25rem' }}>Set up {status.tenant.name}</h2>
                        <p className="text-muted">Your workspace starts empty. Follow these steps to get ready for submissions.</p>
                    </div>
                    <strong style={{ color: 'var(--primary)' }}>{doneCount} of {steps.length} done</strong>
                </div>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '0.5rem' }}>Workspace sign-in link</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Share this with faculty, chairs and deans. Or tell them to enter the workspace name <strong>{status.tenant.slug}</strong> on the sign-in page.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="text" readOnly value={signInLink} style={{ flex: 1, minWidth: 220 }} onFocus={e => e.target.select()} />
                    <button className="btn btn-secondary" onClick={copyLink}>
                        {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                    </button>
                </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {steps.map((step, i) => (
                    <div key={step.title} className={`setup-step ${step.done ? 'done' : ''}`}>
                        <div className="setup-step-icon">{step.done ? <Check size={18} /> : i + 1}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <step.icon size={16} color="var(--primary)" />
                                <strong>{step.title}</strong>
                                <span className={`badge ${step.done ? 'badge-approved' : 'badge-pending'}`}>{step.detail}</span>
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.875rem', margin: '0.35rem 0 0.75rem' }}>{step.body}</p>
                            <Link href={step.href} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                                {step.action} <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
