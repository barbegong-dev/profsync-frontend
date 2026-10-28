'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import api, { getErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/feedback';
import { CheckCircle2, Clock, XCircle, CircleDashed, AlertTriangle, ArrowRight } from 'lucide-react';

type Status = 'approved' | 'pending' | 'rejected' | 'missing';

interface Counts {
    expected: number;
    approved: number;
    pending: number;
    rejected: number;
    missing: number;
    completion_rate: number;
}

interface Analytics {
    scope: 'workspace' | 'department';
    department: { id: number; name: string } | null;
    semester: { id: number; name: string } | null;
    max_chairs: number;
    summary: Counts & {
        faculty: number;
        requirements: number;
        overdue: number;
        ready_for_clearance: number;
        chairs: number;
        pending_signups?: number;
    };
    by_department: (Counts & { id: number; name: string; faculty: number; chairs: number; ready: number })[];
    by_requirement: (Counts & { id: number; name: string; deadline: string | null; is_required: boolean; overdue: number })[];
    activity: { week_start: string; uploads: number }[];
    attention: (Counts & { id: number; name: string; department: string | null; overdue: number })[];
    roles: Record<string, number> | null;
}

// Status colours are reserved for submission state and always shown with an icon + label
const STATUSES: { key: Status; label: string; color: string; icon: React.ElementType }[] = [
    { key: 'approved', label: 'Approved', color: 'var(--success)', icon: CheckCircle2 },
    { key: 'pending', label: 'Pending review', color: 'var(--warning)', icon: Clock },
    { key: 'rejected', label: 'Rejected', color: 'var(--error)', icon: XCircle },
    { key: 'missing', label: 'Not submitted', color: 'var(--chart-empty)', icon: CircleDashed },
];

const ROLE_LABELS: Record<string, string> = {
    faculty: 'Faculty',
    program_chair: 'Program Chairs',
    dean: 'Deans',
    admin: 'Admins',
};

const fmt = (n: number) => n.toLocaleString();
const pct = (n: number) => `${Math.round(n)}%`;

interface Tip { x: number; y: number; title: string; lines: string[] }

export default function AnalyticsDashboard() {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [tip, setTip] = useState<Tip | null>(null);

    useEffect(() => {
        api.get('/api/analytics')
            .then(res => setData(res.data))
            .catch(error => toast.error('Could not load analytics', getErrorMessage(error, 'Please refresh the page.')))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading analytics...</div>;
    if (!data) return <div className="card"><p className="text-muted">Analytics are not available right now.</p></div>;

    const { summary } = data;
    const isWorkspace = data.scope === 'workspace';
    const showTip = (e: React.MouseEvent | React.FocusEvent, title: string, lines: string[]) => {
        const rect = (e.currentTarget as Element).getBoundingClientRect();
        setTip({ x: rect.left + rect.width / 2, y: rect.top, title, lines });
    };
    const hideTip = () => setTip(null);

    const statusLines = (c: Counts) => STATUSES.map(s => `${s.label}: ${fmt(c[s.key])}`);

    return (
        <div className="dashboard-grid">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.25rem' }}>{isWorkspace ? 'Workspace analytics' : `${data.department?.name ?? 'Department'} analytics`}</h2>
                        <p className="text-muted">
                            {data.semester
                                ? <>Submissions for <strong>{data.semester.name}</strong> across {fmt(summary.faculty)} faculty and {fmt(summary.requirements)} requirement{summary.requirements === 1 ? '' : 's'}.</>
                                : 'No active semester yet. Numbers appear once a semester is active and has requirements.'}
                        </p>
                    </div>
                    {isWorkspace && !!summary.pending_signups && (
                        <Link href="/admin/users" className="btn btn-secondary btn-sm">
                            {summary.pending_signups} sign-up{summary.pending_signups === 1 ? '' : 's'} waiting <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>

            {/* Headline numbers */}
            <div className="stat-grid">
                <div className="card stat-tile stat-hero">
                    <span className="stat-label">Completion rate</span>
                    <span className="stat-value">{pct(summary.completion_rate)}</span>
                    <span className="stat-note">{fmt(summary.approved)} of {fmt(summary.expected)} documents approved</span>
                </div>
                <div className="card stat-tile">
                    <span className="stat-label">Ready for clearance</span>
                    <span className="stat-value">{fmt(summary.ready_for_clearance)}<small> / {fmt(summary.faculty)}</small></span>
                    <span className="stat-note">faculty with every required document approved</span>
                </div>
                <div className="card stat-tile">
                    <span className="stat-label"><Clock size={14} color="var(--warning)" /> Pending review</span>
                    <span className="stat-value">{fmt(summary.pending)}</span>
                    <span className="stat-note">uploads waiting for a program chair</span>
                </div>
                <div className="card stat-tile">
                    <span className="stat-label"><AlertTriangle size={14} color="var(--error)" /> Past deadline</span>
                    <span className="stat-value">{fmt(summary.overdue)}</span>
                    <span className="stat-note">documents not submitted after their deadline</span>
                </div>
            </div>

            {/* Overall status */}
            <div className="card">
                <h3 style={{ marginBottom: '0.25rem' }}>Submission status</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Every expected document this semester, by where it stands.</p>
                <StackBar counts={summary} label="All documents" onTip={showTip} onLeave={hideTip} lines={statusLines} large />
                <Legend counts={summary} />
            </div>

            {isWorkspace && data.by_department.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '0.25rem' }}>By department</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Completion, program chair coverage (max {data.max_chairs} per department) and clearance.</p>
                    <div className="chart-rows">
                        {data.by_department.map(d => (
                            <div key={d.id} className="chart-row">
                                <div className="chart-row-label">
                                    <strong>{d.name}</strong>
                                    <span className="text-muted">
                                        {fmt(d.faculty)} faculty · {d.chairs}/{data.max_chairs} chairs{d.chairs === 0 && <> <AlertTriangle size={12} color="var(--warning)" aria-label="No program chair" /></>} · {fmt(d.ready)} ready
                                    </span>
                                </div>
                                <StackBar counts={d} label={d.name} onTip={showTip} onLeave={hideTip} lines={statusLines} />
                                <span className="chart-row-value">{d.expected ? pct(d.completion_rate) : '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="analytics-split">
                <div className="card">
                    <h3 style={{ marginBottom: '0.25rem' }}>By requirement</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Which documents faculty are finishing, and which are lagging.</p>
                    {data.by_requirement.length === 0 ? (
                        <p className="text-muted">No requirements in the active semester.</p>
                    ) : (
                        <div className="chart-rows">
                            {data.by_requirement.map(r => (
                                <div key={r.id} className="chart-row">
                                    <div className="chart-row-label">
                                        <strong>{r.name}</strong>
                                        <span className="text-muted">
                                            {r.deadline ? `Due ${new Date(r.deadline).toLocaleDateString()}` : 'No deadline'}
                                            {r.overdue > 0 && <> · <span style={{ color: 'var(--error)', fontWeight: 600 }}>{fmt(r.overdue)} overdue</span></>}
                                            {!r.is_required && ' · optional'}
                                        </span>
                                    </div>
                                    <StackBar counts={r} label={r.name} onTip={showTip} onLeave={hideTip} lines={statusLines} />
                                    <span className="chart-row-value">{r.expected ? pct(r.completion_rate) : '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '0.25rem' }}>Uploads per week</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>New submissions over the last {data.activity.length} weeks.</p>
                    <WeeklyColumns weeks={data.activity} onTip={showTip} onLeave={hideTip} />
                </div>
            </div>

            <div className="analytics-split">
                <div className="card">
                    <h3 style={{ marginBottom: '0.25rem' }}>Needs attention</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Faculty with the most documents missing or rejected.</p>
                    {data.attention.length === 0 ? (
                        <p className="text-muted">Nobody is behind. 🎉</p>
                    ) : (
                        <ul className="attention-list">
                            {data.attention.map(f => (
                                <li key={f.id}>
                                    <div style={{ minWidth: 0 }}>
                                        <strong>{f.name}</strong>
                                        <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                            {isWorkspace && f.department ? `${f.department} · ` : ''}
                                            {fmt(f.missing)} not submitted · {fmt(f.rejected)} rejected
                                            {f.overdue > 0 && <> · <span style={{ color: 'var(--error)', fontWeight: 600 }}>{fmt(f.overdue)} overdue</span></>}
                                        </p>
                                    </div>
                                    <Link href={`${isWorkspace ? '/admin/users' : '/chair/members'}/${f.id}/submissions`} className="btn btn-secondary btn-sm">
                                        View <ArrowRight size={14} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>{isWorkspace ? 'Active members' : 'Department'}</h3>
                    <div className="info-grid">
                        {isWorkspace && data.roles
                            ? Object.entries(ROLE_LABELS).map(([role, label]) => (
                                <div key={role} className="info-tile">
                                    <span className="info-tile-label">{label}</span>
                                    <span className="info-tile-value">{fmt(data.roles?.[role] ?? 0)}</span>
                                </div>
                            ))
                            : <>
                                <div className="info-tile"><span className="info-tile-label">Faculty</span><span className="info-tile-value">{fmt(summary.faculty)}</span></div>
                                <div className="info-tile"><span className="info-tile-label">Program chairs</span><span className="info-tile-value">{summary.chairs} / {data.max_chairs}</span></div>
                                <div className="info-tile"><span className="info-tile-label">Rejected</span><span className="info-tile-value">{fmt(summary.rejected)}</span></div>
                                <div className="info-tile"><span className="info-tile-label">Not submitted</span><span className="info-tile-value">{fmt(summary.missing)}</span></div>
                            </>}
                    </div>
                    {!isWorkspace && (
                        <Link href="/chair/members" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
                            Manage faculty <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>

            {/* Portal: the page wrapper keeps a transform from its fade-in, which would offset a fixed tooltip */}
            {tip && createPortal(
                <div className="chart-tooltip" role="status" style={{ left: tip.x, top: tip.y }}>
                    <strong>{tip.title}</strong>
                    {tip.lines.map(line => <span key={line}>{line}</span>)}
                </div>,
                document.body
            )}
        </div>
    );
}

type TipHandler = (e: React.MouseEvent | React.FocusEvent, title: string, lines: string[]) => void;

/** 100% stacked bar of the four submission states. */
function StackBar({ counts, label, onTip, onLeave, lines, large }: {
    counts: Counts; label: string; onTip: TipHandler; onLeave: () => void; lines: (c: Counts) => string[]; large?: boolean;
}) {
    const total = counts.expected;
    const summary = lines(counts).join(', ');

    if (!total) {
        return <div className={`stack-bar empty ${large ? 'large' : ''}`} role="img" aria-label={`${label}: nothing expected yet`} />;
    }

    return (
        <div
            className={`stack-bar ${large ? 'large' : ''}`}
            role="img"
            aria-label={`${label}: ${summary}`}
            tabIndex={0}
            onMouseMove={e => onTip(e, label, lines(counts))}
            onFocus={e => onTip(e, label, lines(counts))}
            onMouseLeave={onLeave}
            onBlur={onLeave}
        >
            {STATUSES.filter(s => counts[s.key] > 0).map(s => (
                <div key={s.key} className="stack-seg" style={{ flexGrow: counts[s.key], background: s.color }} />
            ))}
        </div>
    );
}

function Legend({ counts }: { counts: Counts }) {
    return (
        <ul className="chart-legend">
            {STATUSES.map(s => (
                <li key={s.key}>
                    <span className="legend-swatch" style={{ background: s.color }} />
                    <s.icon size={14} aria-hidden />
                    {s.label}
                    <strong>{fmt(counts[s.key])}</strong>
                    <span className="text-muted">({counts.expected ? pct((counts[s.key] / counts.expected) * 100) : '0%'})</span>
                </li>
            ))}
        </ul>
    );
}

/** Single-series column chart of weekly uploads. */
function WeeklyColumns({ weeks, onTip, onLeave }: { weeks: Analytics['activity']; onTip: TipHandler; onLeave: () => void }) {
    const W = 520, H = 200, pad = { top: 16, right: 8, bottom: 28, left: 32 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;
    const max = Math.max(...weeks.map(w => w.uploads), 0);
    // Clean tick step: 1, 2, 5, 10, 20, 50...
    const step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => s * 4 >= max) ?? Math.ceil(max / 4);
    const top = Math.max(step * Math.ceil(max / step), step);
    const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
    const band = innerW / weeks.length;
    const barW = Math.min(24, band * 0.6);
    const y = (v: number) => pad.top + innerH - (v / top) * innerH;
    const label = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="column-chart" role="img"
            aria-label={`Uploads per week: ${weeks.map(w => `week of ${label(w.week_start)} ${w.uploads}`).join(', ')}`}>
            {ticks.map(t => (
                <g key={t}>
                    <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="chart-grid" />
                    <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="chart-axis">{t}</text>
                </g>
            ))}
            {weeks.map((w, i) => {
                const cx = pad.left + band * i + band / 2;
                const h = (w.uploads / top) * innerH;
                const x = cx - barW / 2, yTop = pad.top + innerH - h, r = Math.min(4, h);
                const isLast = i === weeks.length - 1;
                return (
                    <g key={w.week_start}
                        onMouseMove={e => onTip(e, `Week of ${label(w.week_start)}`, [`${w.uploads} upload${w.uploads === 1 ? '' : 's'}`])}
                        onMouseLeave={onLeave}>
                        {/* Hit target spans the whole band */}
                        <rect x={pad.left + band * i} y={pad.top} width={band} height={innerH} fill="transparent" />
                        {h > 0 && (
                            <path
                                d={`M${x},${pad.top + innerH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${pad.top + innerH} Z`}
                                className={isLast ? 'column current' : 'column'}
                            />
                        )}
                        {isLast && <text x={cx} y={yTop - 6} textAnchor="middle" className="chart-value">{w.uploads}</text>}
                        <text x={cx} y={H - 8} textAnchor="middle" className="chart-axis">{label(w.week_start)}</text>
                    </g>
                );
            })}
        </svg>
    );
}
