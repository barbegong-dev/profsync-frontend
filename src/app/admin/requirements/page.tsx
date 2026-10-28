'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import api, { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Settings2, Trash2, Save, FileCheck, CalendarClock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast, confirmDialog } from '@/components/ui/feedback';

interface Requirement {
    id: number;
    name: string;
    description: string | null;
    semester: { id: number; name: string } | null;
    semester_id: number;
    department: { id: number; name: string } | null; // null: every department
    is_required: boolean;
    deadline: string | null;
    submissions_count: number;
    can_edit: boolean;
}

interface RequirementForm {
    name: string;
    description: string;
    semester_id: string; // Use string for select value
    department_id: string; // '' = all departments
    is_required: boolean;
    deadline: string; // yyyy-mm-dd or ''
}

interface Semester {
    id: number;
    name: string;
    is_active: boolean;
}

const emptyForm: RequirementForm = { name: '', description: '', semester_id: '', department_id: '', is_required: true, deadline: '' };

/** Shared by admins (/admin/requirements) and program chairs (/chair/requirements). */
export default function AdminRequirements() {
    const { user } = useAuth();
    const isChair = !user?.roles.some(r => r.name === 'admin');
    const semestersHref = isChair ? '/chair/semesters' : '/admin/semesters';
    const departmentName = user?.department?.name ?? 'your department';

    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<RequirementForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchRequirements = async () => {
        try {
            const res = await api.get('/api/admin/requirements');
            setRequirements(res.data);
        } catch (error) {
            toast.error('Could not load requirements', getErrorMessage(error, 'Please refresh the page.'));
        } finally {
            setLoading(false);
        }
    };

    const fetchSemesters = async () => {
        try {
            const res = await api.get('/api/semesters');
            setSemesters(res.data);
        } catch {
            console.error('Failed to fetch semesters');
        }
    };

    useEffect(() => {
        fetchRequirements();
        fetchSemesters();
        if (!isChair) {
            api.get('/api/departments').then(res => setDepartments(res.data)).catch(() => console.error('Failed to fetch departments'));
        }
    }, [isChair]);

    const openCreateModal = () => {
        const active = semesters.find(s => s.is_active);
        setEditingId(null);
        setForm({ ...emptyForm, semester_id: active ? active.id.toString() : (semesters[0]?.id.toString() || '') });
        setShowModal(true);
    };

    const openEditModal = (req: Requirement) => {
        setEditingId(req.id);
        setForm({
            name: req.name,
            description: req.description || '',
            semester_id: req.semester_id?.toString() || req.semester?.id.toString() || '',
            department_id: req.department?.id.toString() || '',
            is_required: req.is_required,
            deadline: req.deadline ? req.deadline.slice(0, 10) : '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        // Chairs' requirements always belong to their department; the API fills it in
        const payload = { ...form, deadline: form.deadline || null, department_id: form.department_id || null };

        try {
            if (editingId) {
                await api.put(`/api/admin/requirements/${editingId}`, payload);
                toast.success('Requirement updated', form.name);
            } else {
                await api.post('/api/admin/requirements', payload);
                toast.success('Requirement added', form.name);
            }
            setShowModal(false);
            fetchRequirements();
        } catch (err) {
            toast.error('Could not save requirement', getErrorMessage(err, 'Failed to save requirement'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (req: Requirement) => {
        const hasSubmissions = req.submissions_count > 0;
        const ok = await confirmDialog({
            title: `Delete "${req.name}"?`,
            description: hasSubmissions
                ? `This requirement has ${req.submissions_count} submission${req.submissions_count === 1 ? '' : 's'}. Deleting it also permanently deletes those submissions.`
                : 'This cannot be undone.',
            confirmText: hasSubmissions ? 'Delete with submissions' : 'Delete',
            destructive: true,
            requireText: hasSubmissions ? 'delete' : undefined,
        });
        if (!ok) return;

        setDeletingId(req.id);
        try {
            await api.delete(`/api/admin/requirements/${req.id}`, { params: hasSubmissions ? { force: 'true' } : {} });
            toast.success('Requirement deleted', req.name);
            fetchRequirements();
        } catch (err) {
            // Submissions arrived after the page loaded: the API asks for a forced delete
            if (axios.isAxiosError(err) && err.response?.status === 422 && err.response.data?.requires_confirmation) {
                toast.warning('This requirement now has submissions', 'Refresh and try again to delete it together with its submissions.');
                fetchRequirements();
            } else {
                toast.error('Could not delete requirement', getErrorMessage(err, 'Failed to delete requirement'));
            }
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div>Loading requirements...</div>;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2>Document Requirements</h2>
                    <p className="text-muted">
                        {isChair
                            ? `Add documents that faculty in ${departmentName} must submit. Requirements for every department are set by the workspace admin.`
                            : 'Define the documents that faculty need to submit, for every department or just one.'}
                    </p>
                </div>
                <Button onClick={openCreateModal} disabled={semesters.length === 0}>
                    <Plus size={18} /> New Requirement
                </Button>
            </div>

            {semesters.length === 0 && (
                <div className="notice notice-warning" style={{ marginBottom: '1.5rem' }}>
                    Requirements belong to a semester. <Link href={semestersHref} style={{ color: 'var(--primary)', fontWeight: 600 }}>Create a semester first</Link>.
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Requirement Name</th>
                            <th>Semester</th>
                            <th>Applies to</th>
                            <th>Deadline</th>
                            <th>Compulsory</th>
                            <th>Submissions</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requirements.map(req => (
                            <tr key={req.id}>
                                <td data-label="Requirement Name">
                                    <p style={{ fontWeight: 600 }}>{req.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {req.description || 'No description'}
                                    </p>
                                </td>
                                <td data-label="Semester">{req.semester?.name || 'N/A'}</td>
                                <td data-label="Applies to">
                                    {req.department
                                        ? <span className="badge badge-pending">{req.department.name}</span>
                                        : <span className="badge badge-approved">All departments</span>}
                                </td>
                                <td data-label="Deadline">{req.deadline ? new Date(req.deadline).toLocaleDateString() : '—'}</td>
                                <td data-label="Compulsory">{req.is_required ? 'Yes' : 'No'}</td>
                                <td data-label="Submissions">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FileCheck size={14} className="text-muted" />
                                        {req.submissions_count}
                                    </div>
                                </td>
                                <td data-label="Action">
                                    {!req.can_edit ? (
                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Set by admin</span>
                                    ) : <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button variant="secondary" size="icon" onClick={() => openEditModal(req)} title="Edit" aria-label="Edit" disabled={deletingId === req.id}>
                                            <Settings2 size={16} />
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDelete(req)} loading={deletingId === req.id} title="Delete" aria-label="Delete">
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>}
                                </td>
                            </tr>
                        ))}
                        {requirements.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p className="text-muted">No requirements yet. Add the documents faculty must submit, e.g. Course Syllabus.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal open={showModal} onClose={() => setShowModal(false)} locked={saving} title={editingId ? 'Edit Requirement' : 'New Requirement'}>
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={saving} style={{ border: 'none' }}>
                        <div className="input-group">
                            <label>Requirement Name *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Course Syllabus"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <label>Description</label>
                            <textarea
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Brief description of this requirement..."
                            />
                        </div>

                        <div className="input-group">
                            <label>Semester *</label>
                            <select value={form.semester_id} onChange={(e) => setForm({ ...form, semester_id: e.target.value })} required>
                                <option value="" disabled>Select Semester</option>
                                {semesters.map(sem => (
                                    <option key={sem.id} value={sem.id}>
                                        {sem.name} {sem.is_active ? '(Active)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Applies to *</label>
                            {isChair ? (
                                <input type="text" readOnly disabled value={`${departmentName} faculty only`} />
                            ) : (
                                <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                                    <option value="">All departments</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name} only</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="input-group">
                            <label><CalendarClock size={14} style={{ marginRight: '0.4rem' }} /> Deadline (optional)</label>
                            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.is_required}
                                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                                style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                            />
                            Compulsory: needed for clearance
                        </label>
                    </fieldset>

                    <div className="ui-dialog-footer">
                        <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                        <Button type="submit" loading={saving}>
                            <Save size={16} /> {saving ? 'Saving…' : 'Save Requirement'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
