'use client';

import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/lib/api';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Tabs from '@/components/ui/Tabs';
import { toast } from '@/components/ui/feedback';
import { downloadSubmission, viewSubmission, submissionFilename } from '@/lib/files';
import { CheckCircle, XCircle, ExternalLink, MessageSquare, Download, Clock, CheckCircle2 } from 'lucide-react';

interface Submission {
    id: number;
    faculty: { name: string; department: { name: string } };
    requirement: { name: string };
    status: 'pending' | 'approved' | 'rejected';
    file_path: string;
    remarks: string | null;
    created_at: string;
}

interface ComplianceData {
    faculty: {
        id: number;
        name: string;
        email?: string;
        approved_count?: number;
        total_count?: number;
        is_ready_for_clearance?: boolean;
        submissions: {
            requirement_id: number;
            requirement_name: string;
            status: string;
            deadline: string | null;
        }[];
    }[];
    requirements: { id: number; name: string }[];
}

export default function ChairDashboard() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
    const [view, setView] = useState<'reviews' | 'compliance'>('reviews');
    const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [clearanceTab, setClearanceTab] = useState<'all' | 'ready' | 'not_ready'>('all');
    const [loading, setLoading] = useState(true);
    const [reviewModal, setReviewModal] = useState<{ id: number; remarks: string } | null>(null);
    const [reviewing, setReviewing] = useState<'approved' | 'rejected' | null>(null);
    const [fileBusy, setFileBusy] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [reviewsRes, complianceRes] = await Promise.all([
                api.get('/api/reviews'),
                api.get('/api/compliance')
            ]);
            setSubmissions(reviewsRes.data);
            setComplianceData(complianceRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleReview = async (id: number, status: 'approved' | 'rejected', remarks: string) => {
        if (reviewing) return;
        if (status === 'rejected' && !remarks.trim()) {
            toast.warning('Add remarks first', 'Tell the faculty member what to fix before rejecting.');
            return;
        }
        setReviewing(status);
        try {
            await api.post(`/api/reviews/${id}`, { status, remarks });
            setReviewModal(null);
            toast.success(`Submission ${status === 'approved' ? 'approved' : 'rejected'}`, 'The faculty member has been notified by email.');
            await fetchData();
        } catch (error) {
            toast.error('Review failed', getErrorMessage(error, 'There was an error submitting your review.'));
        } finally {
            setReviewing(null);
        }
    };

    const runFileAction = async (key: string, action: () => Promise<void>, failure: string) => {
        setFileBusy(key);
        try {
            await action();
        } catch (error) {
            toast.error(failure, getErrorMessage(error, 'Please try again.'));
        } finally {
            setFileBusy(null);
        }
    };

    if (loading) return <div>Loading submissions...</div>;

    return (
        <div>
            <div className="card">
                <div style={{ marginBottom: '1.5rem' }}>
                    <Tabs
                        label="Section"
                        value={view}
                        onChange={setView}
                        tabs={[
                            { value: 'reviews', label: 'Reviews', count: submissions.filter(s => s.status === 'pending').length },
                            { value: 'compliance', label: 'Compliance Report' },
                        ]}
                    />
                </div>

                {view === 'reviews' ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ marginBottom: '0.25rem' }}>Submissions Review</h2>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Evaluate and update status for faculty requirement submissions</p>
                            </div>

                            <Tabs
                                label="Filter by status"
                                value={statusTab}
                                onChange={setStatusTab}
                                tabs={[
                                    { value: 'all', label: 'All', count: submissions.length },
                                    { value: 'pending', label: 'Pending', count: submissions.filter(s => s.status === 'pending').length, tone: 'warning' },
                                    { value: 'approved', label: 'Approved', count: submissions.filter(s => s.status === 'approved').length, tone: 'success' },
                                    { value: 'rejected', label: 'Rejected', count: submissions.filter(s => s.status === 'rejected').length, tone: 'danger' },
                                ]}
                            />
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Faculty Name</th>
                                        <th>Requirement</th>
                                        <th>Date Submitted</th>
                                        <th>File</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions
                                        .filter(sub => statusTab === 'all' ? true : sub.status === statusTab)
                                        .map((sub) => (
                                            <tr key={sub.id}>
                                                <td data-label="Faculty Name">
                                                    <p style={{ fontWeight: 500 }}>{sub.faculty.name}</p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.faculty.department?.name}</p>
                                                </td>
                                                <td data-label="Requirement">{sub.requirement.name}</td>
                                                <td data-label="Date Submitted">{new Date(sub.created_at).toLocaleDateString()}</td>
                                                <td data-label="File">
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            loading={fileBusy === `view-${sub.id}`}
                                                            disabled={fileBusy !== null}
                                                            onClick={() => runFileAction(`view-${sub.id}`, () => viewSubmission(sub.id), 'Could not open the file')}
                                                        >
                                                            <ExternalLink size={14} /> View
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            aria-label="Download"
                                                            title="Download"
                                                            loading={fileBusy === `download-${sub.id}`}
                                                            disabled={fileBusy !== null}
                                                            onClick={() => runFileAction(`download-${sub.id}`, () => downloadSubmission(sub.id, submissionFilename(sub.id, sub.file_path)), 'Could not download the file')}
                                                        >
                                                            <Download size={14} />
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td data-label="Status">
                                                    <span className={`badge badge-${sub.status}`}>
                                                        {sub.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td data-label="Action">
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <Button size="sm" onClick={() => setReviewModal({ id: sub.id, remarks: sub.remarks || '' })}>
                                                            <MessageSquare size={14} /> {sub.status === 'pending' ? 'Review' : 'Update Review'}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {submissions.filter(sub => statusTab === 'all' ? true : sub.status === statusTab).length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                No submissions found in this status.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ marginBottom: '0.25rem' }}>Department Compliance & Clearance</h2>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Faculty completion tracking and clearance status tags</p>
                            </div>

                            {/* Clearance Status Filter Tabs */}
                            {complianceData && (
                                <Tabs
                                    label="Filter by clearance"
                                    value={clearanceTab}
                                    onChange={setClearanceTab}
                                    tabs={[
                                        { value: 'all', label: 'All Faculty', count: complianceData.faculty.length },
                                        { value: 'ready', label: 'Ready for Clearance', count: complianceData.faculty.filter(f => f.is_ready_for_clearance).length, tone: 'success' },
                                        { value: 'not_ready', label: 'Not Yet Ready', count: complianceData.faculty.filter(f => !f.is_ready_for_clearance).length, tone: 'warning' },
                                    ]}
                                />
                            )}
                        </div>

                        <div className="table-container">
                            {complianceData && (
                                <table style={{ minWidth: '900px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: 'var(--surface)', minWidth: '180px' }}>Faculty</th>
                                            <th style={{ minWidth: '190px' }}>Clearance Status</th>
                                            {complianceData.requirements.map(req => (
                                                <th key={req.id} style={{ textAlign: 'center', minWidth: '130px' }}>{req.name}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {complianceData.faculty
                                            .filter(fac => {
                                                if (clearanceTab === 'ready') return fac.is_ready_for_clearance;
                                                if (clearanceTab === 'not_ready') return !fac.is_ready_for_clearance;
                                                return true;
                                            })
                                            .map(fac => (
                                                <tr key={fac.id}>
                                                    <td style={{ position: 'sticky', left: 0, backgroundColor: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                                                        {fac.name}
                                                        {fac.email && <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>{fac.email}</div>}
                                                    </td>
                                                    <td>
                                                        {fac.is_ready_for_clearance ? (
                                                            <span className="badge badge-approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, padding: '0.35rem 0.75rem' }}>
                                                                <CheckCircle2 size={13} /> READY FOR CLEARANCE
                                                            </span>
                                                        ) : (
                                                            <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, padding: '0.35rem 0.75rem' }}>
                                                                <Clock size={13} /> NOT YET READY ({fac.approved_count || 0}/{fac.total_count || complianceData.requirements.length})
                                                            </span>
                                                        )}
                                                    </td>
                                                    {fac.submissions.map(sub => (
                                                        <td key={sub.requirement_id} style={{ textAlign: 'center' }}>
                                                            <span className={`badge badge-${sub.status === 'missing' ? 'rejected' : sub.status}`}>
                                                                {sub.status === 'missing' ? 'MISSING' : sub.status.toUpperCase()}
                                                            </span>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        {complianceData.faculty.filter(fac => {
                                            if (clearanceTab === 'ready') return fac.is_ready_for_clearance;
                                            if (clearanceTab === 'not_ready') return !fac.is_ready_for_clearance;
                                            return true;
                                        }).length === 0 && (
                                            <tr>
                                                <td colSpan={2 + complianceData.requirements.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                    No faculty members match the selected clearance filter.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>

            <Modal
                open={reviewModal !== null}
                onClose={() => setReviewModal(null)}
                locked={reviewing !== null}
                title="Review Submission"
                description="Give feedback, then approve or reject. The faculty member is notified by email."
                maxWidth={480}
            >
                {reviewModal && (
                    <>
                        <div className="input-group">
                            <label>Remarks / Feedback</label>
                            <textarea
                                rows={4}
                                value={reviewModal.remarks}
                                onChange={(e) => setReviewModal({ ...reviewModal, remarks: e.target.value })}
                                placeholder="Required when rejecting: tell them what to fix."
                                disabled={reviewing !== null}
                                autoFocus
                            />
                        </div>
                        <div className="ui-dialog-footer">
                            <Button variant="secondary" onClick={() => setReviewModal(null)} disabled={reviewing !== null}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                loading={reviewing === 'rejected'}
                                disabled={reviewing !== null}
                                onClick={() => handleReview(reviewModal.id, 'rejected', reviewModal.remarks)}
                            >
                                <XCircle size={18} /> {reviewing === 'rejected' ? 'Rejecting…' : 'Reject'}
                            </Button>
                            <Button
                                variant="success"
                                loading={reviewing === 'approved'}
                                disabled={reviewing !== null}
                                onClick={() => handleReview(reviewModal.id, 'approved', reviewModal.remarks)}
                            >
                                <CheckCircle size={18} /> {reviewing === 'approved' ? 'Approving…' : 'Approve'}
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
