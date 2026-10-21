'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { getErrorMessage } from '@/lib/api';
import { UserPlus, Trash2, Check, Edit2, Save, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast, confirmDialog } from '@/components/ui/feedback';

interface User {
    id: number;
    name: string;
    email: string;
    department: { id: number; name: string } | null;
    roles: { name: string }[];
    status: string;
}

interface Department {
    id: number;
    name: string;
}

type ModalMode = 'add' | 'edit' | 'approve';

const ROLE_LABELS: Record<string, string> = {
    faculty: 'Faculty',
    program_chair: 'Program Chair',
    dean: 'Dean',
    admin: 'Admin',
};

const emptyForm = { name: '', email: '', role: 'faculty', department_id: '' };

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalMode, setModalMode] = useState<ModalMode | null>(null);
    const [currentUser, setCurrentUser] = useState<number | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/admin/users');
            setUsers(res.data);
        } catch (error) {
            toast.error('Could not load members', getErrorMessage(error, 'Please refresh the page.'));
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/api/departments');
            setDepartments(res.data);
        } catch {
            console.error('Failed to fetch departments');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const openModal = (mode: ModalMode, user: User | null = null) => {
        setModalMode(mode);
        setCurrentUser(user?.id ?? null);
        setFormData(user ? {
            name: user.name,
            email: user.email,
            role: user.roles[0]?.name || 'faculty',
            department_id: user.department?.id.toString() || ''
        } : emptyForm);
    };

    const closeModal = () => setModalMode(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        const payload = { ...formData, department_id: formData.department_id || null };

        try {
            if (modalMode === 'add') {
                await api.post('/api/admin/users', payload);
                toast.success('Member added', `An invitation was emailed to ${formData.email}.`);
            } else {
                await api.put(`/api/admin/users/${currentUser}`, payload);
                if (modalMode === 'approve') {
                    const res = await api.post(`/api/admin/users/${currentUser}/approve`);
                    toast.success('Member approved', res.data?.message);
                } else {
                    toast.success('Member updated');
                }
            }
            closeModal();
            fetchUsers();
        } catch (error) {
            toast.error('Could not save', getErrorMessage(error, 'Operation failed.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user: User) => {
        const pending = user.status === 'pending';
        const ok = await confirmDialog({
            title: pending ? 'Reject this sign-up?' : 'Remove this member?',
            description: `${user.name} (${user.email}) will lose access to this workspace and will be notified by email.`,
            confirmText: pending ? 'Reject' : 'Remove',
            destructive: true,
        });
        if (!ok) return;

        setDeletingId(user.id);
        try {
            const res = await api.delete(`/api/admin/users/${user.id}`);
            toast.success(pending ? 'Sign-up rejected' : 'Member removed', res.data?.message);
            fetchUsers();
        } catch (error) {
            toast.error('Could not remove member', getErrorMessage(error, 'Failed to delete user.'));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div>Loading users...</div>;

    const pendingCount = users.filter(u => u.status === 'pending').length;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2>Members</h2>
                    <p className="text-muted">
                        Members sign in with Google. New sign-ups appear here as pending
                        {pendingCount > 0 && <> — <strong style={{ color: 'var(--warning)' }}>{pendingCount} waiting for approval</strong></>}.
                    </p>
                </div>
                <Button onClick={() => openModal('add')}>
                    <UserPlus size={18} /> Add Member
                </Button>
            </div>

            {departments.length === 0 && (
                <div className="notice notice-warning" style={{ marginBottom: '1.5rem' }}>
                    No departments yet. <Link href="/admin/departments" style={{ color: 'var(--primary)', fontWeight: 600 }}>Add departments first</Link> so you can assign members to them.
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td data-label="User">
                                    <p style={{ fontWeight: 600 }}>{user.name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</p>
                                </td>
                                <td data-label="Role"><span className="badge badge-approved" style={{ textTransform: 'uppercase' }}>{ROLE_LABELS[user.roles[0]?.name] || 'No Role'}</span></td>
                                <td data-label="Department">{user.department?.name || (user.roles[0]?.name === 'admin' ? 'All (Admin)' : '—')}</td>
                                <td data-label="Status">
                                    {user.status === 'pending' ? (
                                        <span className="badge badge-pending">PENDING</span>
                                    ) : (
                                        <span className="badge badge-approved">ACTIVE</span>
                                    )}
                                </td>
                                <td data-label="Action">
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {user.status === 'pending' ? (
                                            <Button variant="success" size="sm" onClick={() => openModal('approve', user)} disabled={deletingId === user.id}>
                                                <Check size={16} /> Approve
                                            </Button>
                                        ) : (
                                            <Button variant="secondary" size="icon" onClick={() => openModal('edit', user)} title="Edit" aria-label="Edit" disabled={deletingId === user.id}>
                                                <Edit2 size={16} />
                                            </Button>
                                        )}
                                        {user.roles.some(r => r.name === 'faculty') && user.status !== 'pending' && (
                                            <Link href={`/admin/users/${user.id}/submissions`} className="btn btn-secondary btn-icon" title="View submissions" aria-label="View submissions">
                                                <FileText size={16} />
                                            </Link>
                                        )}
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => handleDelete(user)}
                                            loading={deletingId === user.id}
                                            title={user.status === 'pending' ? 'Reject' : 'Remove'}
                                            aria-label={user.status === 'pending' ? 'Reject' : 'Remove'}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                open={modalMode !== null}
                onClose={closeModal}
                locked={saving}
                title={modalMode ? { add: 'Add Member', edit: 'Edit Member', approve: 'Approve Sign-up' }[modalMode] : ''}
                description={
                    modalMode === 'add' ? 'They will get an email invitation and sign in with the Google account for this address. No password needed.'
                        : modalMode === 'approve' ? 'Choose their role and department, then approve. They will be notified by email.'
                            : 'Change this member\'s role or department. They will be notified by email.'
                }
            >
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={saving} style={{ border: 'none' }}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Google Email Address</label>
                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={modalMode === 'approve'} />
                        </div>
                        <div className="input-group">
                            <label>Role</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Department {formData.role === 'admin' && '(Optional)'}</label>
                            <select
                                value={formData.department_id}
                                onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                                required={formData.role !== 'admin'}
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </fieldset>
                    <div className="ui-dialog-footer">
                        <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
                        <Button type="submit" variant={modalMode === 'approve' ? 'success' : 'primary'} loading={saving}>
                            {modalMode === 'approve'
                                ? <><Check size={18} /> {saving ? 'Approving…' : 'Approve'}</>
                                : <><Save size={18} /> {saving ? 'Saving…' : modalMode === 'add' ? 'Add Member' : 'Save Changes'}</>}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
