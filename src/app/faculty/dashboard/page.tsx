'use client';

import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/lib/api';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import { toast } from '@/components/ui/feedback';
import { Upload, FileText, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

interface ChecklistItem {
    requirement_id: number;
    requirement: string;
    status: 'pending' | 'approved' | 'rejected';
    remarks: string | null;
    file_path: string | null;
    deadline: string | null;
}

export default function FacultyDashboard() {
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<number | null>(null);
    const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const fetchData = async () => {
        try {
            const checklistRes = await api.get('/api/submissions/checklist');
            setChecklist(checklistRes.data);
        } catch (error) {
            toast.error('Could not load your checklist', getErrorMessage(error, 'Please refresh the page.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFileUpload = async (requirementId: number, file: File) => {
        if (uploading !== null) return;
        setUploading(requirementId);
        const formData = new FormData();
        formData.append('requirement_id', requirementId.toString());
        formData.append('document', file);

        try {
            await api.post('/api/submissions/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchData();
            toast.success('Document uploaded', 'Your Program Chair has been notified by email.');
        } catch (error) {
            toast.error('Upload failed', getErrorMessage(error, 'There was an error uploading your document. Please try again.'));
        } finally {
            setUploading(null);
        }
    };

    if (loading) return <div>Loading checklist...</div>;

    const approvedCount = checklist.filter(i => i.status === 'approved').length;
    const pendingCount = checklist.filter(i => i.status === 'pending').length;
    const rejectedCount = checklist.filter(i => i.status === 'rejected').length;
    const totalCount = checklist.length;
    const isReadyForClearance = totalCount > 0 && approvedCount >= totalCount;
    const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

    const filteredChecklist = checklist.filter(item => {
        if (statusTab === 'all') return true;
        return item.status === statusTab;
    });

    return (
        <div className="dashboard-grid">
            {/* Clearance Status Banner */}
            <div className="card" style={{
                borderLeft: isReadyForClearance ? '4px solid var(--success)' : '4px solid var(--warning)',
                background: isReadyForClearance
                    ? 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)'
                    : 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '1.25rem 1.5rem'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isReadyForClearance ? '#059669' : '#D97706',
                    color: 'white',
                    flexShrink: 0
                }}>
                    {isReadyForClearance ? <ShieldCheck size={24} /> : <Clock size={24} />}
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        color: isReadyForClearance ? '#065F46' : '#92400E',
                        marginBottom: '0.25rem'
                    }}>
                        {isReadyForClearance ? '✅ Ready for Clearance' : '⏳ Not Yet Ready for Clearance'}
                    </h3>
                    <p style={{
                        fontSize: '0.875rem',
                        color: isReadyForClearance ? '#047857' : '#B45309'
                    }}>
                        {isReadyForClearance
                            ? 'Congratulations! All your requirements have been approved. You are cleared.'
                            : `${approvedCount} of ${totalCount} requirements approved. Complete all requirements to be tagged as ready for clearance.`
                        }
                    </p>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: `3px solid ${isReadyForClearance ? '#059669' : '#D97706'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.7)'
                    }}>
                        <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: isReadyForClearance ? '#059669' : '#D97706'
                        }}>{progressPercent}%</span>
                    </div>
                </div>
            </div>

            {/* Main Checklist Card */}
            <div className="card" style={{ marginBottom: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.25rem' }}>Document Checklist</h2>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>{approvedCount} / {totalCount} Completed</p>
                    </div>
                    <Tabs
                        label="Filter by status"
                        value={statusTab}
                        onChange={setStatusTab}
                        tabs={[
                            { value: 'all', label: 'All', count: totalCount },
                            { value: 'pending', label: 'Pending', count: pendingCount, tone: 'warning' },
                            { value: 'approved', label: 'Approved', count: approvedCount, tone: 'success' },
                            { value: 'rejected', label: 'Rejected', count: rejectedCount, tone: 'danger' },
                        ]}
                    />
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL PROGRESS</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progressPercent === 100 ? 'var(--success)' : 'var(--primary)' }}>{progressPercent}%</span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: 'var(--surface)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            backgroundColor: progressPercent === 100 ? 'var(--success)' : 'var(--primary)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Requirement</th>
                                <th>Deadline</th>
                                <th>Status</th>
                                <th>Remarks</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredChecklist.map((item) => (
                                <tr key={item.requirement_id}>
                                    <td data-label="Requirement">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <FileText size={18} className="text-muted" />
                                            <div>
                                                <p style={{ fontWeight: 500 }}>{item.requirement}</p>
                                                {item.file_path && <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>File uploaded</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Deadline">
                                        {item.deadline ? (
                                            <span style={{
                                                color: new Date(item.deadline) < new Date() && item.status !== 'approved'
                                                    ? 'var(--error)' : 'var(--text-muted)',
                                                display: 'flex', alignItems: 'center', gap: '0.25rem'
                                            }}>
                                                <Clock size={14} />
                                                {new Date(item.deadline).toLocaleDateString()}
                                            </span>
                                        ) : <span className="text-muted">-</span>}
                                    </td>
                                    <td data-label="Status">
                                        <span className={`badge badge-${item.status}`}>
                                            {item.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td data-label="Remarks">
                                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                                            {item.remarks || '-'}
                                        </span>
                                    </td>
                                    <td data-label="Action">
                                        {(item.status === 'pending' || item.status === 'rejected') ? (
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.doc,.docx"
                                                    id={`file-${item.requirement_id}`}
                                                    style={{ display: 'none' }}
                                                    disabled={uploading !== null}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        e.target.value = ''; // allow picking the same file again
                                                        if (file) handleFileUpload(item.requirement_id, file);
                                                    }}
                                                />
                                                <Button
                                                    size="sm"
                                                    loading={uploading === item.requirement_id}
                                                    disabled={uploading !== null}
                                                    onClick={() => document.getElementById(`file-${item.requirement_id}`)?.click()}
                                                >
                                                    <Upload size={14} />
                                                    {uploading === item.requirement_id ? 'Uploading…' : item.status === 'rejected' ? 'Re-upload' : 'Upload'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                <CheckCircle2 size={16} /> Verified
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredChecklist.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No requirements found in this status.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
