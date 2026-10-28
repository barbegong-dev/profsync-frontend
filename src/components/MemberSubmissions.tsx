'use client';

import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { downloadSubmission, viewSubmission, submissionFilename } from '@/lib/files';

interface SubmissionItem {
    requirement_id: number;
    requirement: string;
    status: 'pending' | 'approved' | 'rejected';
    remarks: string | null;
    file_path: string | null;
    deadline: string | null;
    submission_id: number | null;
}

interface User {
    id: number;
    name: string;
    email: string;
    department: { name: string } | null;
}

/** Active-semester checklist of one faculty member. apiBase is '/api/admin/users' or '/api/chair/members'. */
export default function MemberSubmissions({ apiBase }: { apiBase: string }) {
    const { id } = useParams<{ id: string }>();
    const [checklist, setChecklist] = useState<SubmissionItem[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null); // e.g. "view-12" / "download-12"
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const subRes = await api.get(`${apiBase}/${id}/submissions`);
                setChecklist(subRes.data);

                // No single-user endpoint: find the member in the workspace list for the header
                const usersRes = await api.get(apiBase);
                const foundUser = usersRes.data.find((u: User) => u.id.toString() === id);
                if (foundUser) setUser(foundUser);
            } catch (error) {
                toast.error('Could not load submissions', getErrorMessage(error, 'Please try again.'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, apiBase]);

    const run = async (key: string, action: () => Promise<void>, failure: string) => {
        setBusy(key);
        try {
            await action();
        } catch (error) {
            toast.error(failure, getErrorMessage(error, 'Please try again.'));
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <div>Loading submissions...</div>;

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem', minWidth: 0 }}>
                <Button variant="secondary" size="icon" onClick={() => router.back()} aria-label="Back">
                    <ArrowLeft size={18} />
                </Button>
                <div>
                    <h2>Submission Checklist</h2>
                    {user && <p className="text-muted">Faculty: {user.name} ({user.department?.name || 'N/A'})</p>}
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Requirement</th>
                            <th>Deadline</th>
                            <th>Status</th>
                            <th>File</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {checklist.map((item) => (
                            <tr key={item.requirement_id}>
                                <td data-label="Requirement">
                                    <p style={{ fontWeight: 500 }}>{item.requirement}</p>
                                </td>
                                <td data-label="Deadline">
                                    {item.deadline ? new Date(item.deadline).toLocaleDateString() : 'N/A'}
                                </td>
                                <td data-label="Status">
                                    <span className={`badge badge-${item.status}`}>
                                        {item.status.toUpperCase()}
                                    </span>
                                </td>
                                <td data-label="File">
                                    {item.file_path && item.submission_id ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={busy === `view-${item.submission_id}`}
                                                disabled={busy !== null}
                                                onClick={() => run(`view-${item.submission_id}`, () => viewSubmission(item.submission_id!), 'Could not open the file')}
                                            >
                                                <ExternalLink size={14} /> View
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                aria-label="Download"
                                                title="Download"
                                                loading={busy === `download-${item.submission_id}`}
                                                disabled={busy !== null}
                                                onClick={() => run(
                                                    `download-${item.submission_id}`,
                                                    () => downloadSubmission(item.submission_id!, submissionFilename(item.submission_id!, item.file_path)),
                                                    'Could not download the file'
                                                )}
                                            >
                                                <Download size={14} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>No file</span>
                                    )}
                                </td>
                                <td data-label="Remarks">
                                    {item.remarks ? (
                                        <span style={{ fontSize: '0.8rem' }}>{item.remarks}</span>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                        {checklist.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p className="text-muted">No requirements in the active semester.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
