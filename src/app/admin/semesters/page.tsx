'use client';

import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/lib/api';
import { Plus, Trash2, Save, Edit2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast, confirmDialog } from '@/components/ui/feedback';

interface Semester {
    id: number;
    name: string;
    is_active: boolean;
    created_at: string;
    requirements_count?: number;
}

export default function AdminSemesters() {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSemester, setCurrentSemester] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        is_active: false
    });

    const fetchSemesters = async () => {
        try {
            const res = await api.get('/api/semesters');
            setSemesters(res.data);
        } catch (error) {
            toast.error('Could not load semesters', getErrorMessage(error, 'Please refresh the page.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSemesters();
    }, []);

    const openModal = (semester: Semester | null = null) => {
        setIsEditing(!!semester);
        setCurrentSemester(semester?.id ?? null);
        setFormData({
            name: semester?.name ?? '',
            is_active: semester ? Boolean(semester.is_active) : semesters.length === 0,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            if (isEditing && currentSemester) {
                await api.put(`/api/semesters/${currentSemester}`, formData);
                toast.success('Semester updated', formData.name);
            } else {
                await api.post('/api/semesters', formData);
                toast.success('Semester created', formData.is_active ? `${formData.name} is now the active semester.` : formData.name);
            }
            setIsModalOpen(false);
            fetchSemesters();
        } catch (error) {
            toast.error('Could not save semester', getErrorMessage(error, 'Operation failed.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (semester: Semester) => {
        const ok = await confirmDialog({
            title: `Delete ${semester.name}?`,
            description: 'This permanently removes the semester together with all of its requirements and every submission made for them.',
            confirmText: 'Delete semester',
            destructive: true,
            requireText: 'delete',
        });
        if (!ok) return;

        setDeletingId(semester.id);
        try {
            await api.delete(`/api/semesters/${semester.id}`, { params: { confirmation: 'delete' } });
            toast.success('Semester deleted', semester.name);
            fetchSemesters();
        } catch (error) {
            toast.error('Could not delete semester', getErrorMessage(error, 'Failed to delete semester.'));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div>Loading semesters...</div>;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2>Academic Semesters</h2>
                    <p className="text-muted">Only one semester can be active. Faculty see the requirements of the active semester.</p>
                </div>
                <Button onClick={() => openModal()}>
                    <Plus size={18} /> Add Semester
                </Button>
            </div>

            {semesters.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    No semesters yet. Add the current one, e.g. &quot;1st Semester 2026-2027&quot;, and mark it active.
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Semester Name</th>
                                <th>Requirements</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {semesters.map(semester => (
                                <tr key={semester.id}>
                                    <td data-label="Semester Name">
                                        <p style={{ fontWeight: 600 }}>{semester.name}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created: {new Date(semester.created_at).toLocaleDateString()}</p>
                                    </td>
                                    <td data-label="Requirements">{semester.requirements_count ?? 0}</td>
                                    <td data-label="Status">
                                        {semester.is_active ? (
                                            <span className="badge badge-approved">ACTIVE</span>
                                        ) : (
                                            <span className="badge badge-pending">INACTIVE</span>
                                        )}
                                    </td>
                                    <td data-label="Action">
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Button variant="secondary" size="icon" onClick={() => openModal(semester)} title="Edit" aria-label="Edit" disabled={deletingId === semester.id}>
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={() => handleDelete(semester)} loading={deletingId === semester.id} title="Delete" aria-label="Delete">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} locked={saving} title={isEditing ? 'Edit Semester' : 'Add Semester'} maxWidth={460}>
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={saving} style={{ border: 'none' }}>
                        <div className="input-group">
                            <label>Semester Name</label>
                            <input type="text" required autoFocus placeholder="e.g. 1st Semester 2026-2027" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                            />
                            Set as the active semester
                        </label>
                    </fieldset>
                    <div className="ui-dialog-footer">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
                        <Button type="submit" loading={saving}>
                            <Save size={18} /> {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Semester'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
