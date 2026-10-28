'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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

/** admin: every member of the workspace. chair: faculty of the chair's own department. */
export type MembersScope = 'admin' | 'chair';

const ROLE_LABELS: Record<string, string> = {
    faculty: 'Faculty',
    program_chair: 'Program Chair',
    dean: 'Dean',
    admin: 'Admin',
};

// Keep in sync with MemberController::MAX_CHAIRS in the API
export const MAX_CHAIRS = 2;

const SCOPES = {
    admin: { api: '/api/admin/users', pages: '/admin/users' },
    chair: { api: '/api/chair/members', pages: '/chair/members' },
};

const emptyForm = { name: '', email: '', role: 'faculty', department_id: '' };

const roleOf = (user: User) => user.roles[0]?.name;

export default function MembersManager({ scope }: { scope: MembersScope }) {
    const { user: me } = useAuth();
    const isChair = scope === 'chair';
    const paths = SCOPES[scope];

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
            const res = await api.get(paths.api);
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
        if (!isChair) fetchDepartments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope]);

    // Program chairs per department, not counting the member being edited
    const chairCount = (departmentId: string) => users.filter(u =>
        roleOf(u) === 'program_chair' && u.department?.id.toString() === departmentId && u.id !== currentUser
    ).length;

    const openModal = (mode: ModalMode, user: User | null = null) => {
        setModalMode(mode);
        setCurrentUser(user?.id ?? null);
        setFormData(user ? {
            name: user.name,
            email: user.email,
            role: isChair ? 'faculty' : (roleOf(user) || 'faculty'),
            department_id: user.department?.id.toString() || ''
        } : emptyForm);
    };

    const closeModal = () => setModalMode(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        // Chairs always assign their own department; the API fills it in
        const payload = isChair
            ? { name: formData.name, email: formData.email, role: 'faculty' }
            : { ...formData, department_id: formData.department_id || null };

        try {
            if (modalMode === 'add') {
                await api.post(paths.api, payload);
                toast.success('Member added', `An invitation was emailed to ${formData.email}.`);
            } else {
                await api.put(`${paths.api}/${currentUser}`, payload);
                if (modalMode === 'approve') {
                    const res = await api.post(`${paths.api}/${currentUser}/approve`);
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
            const res = await api.delete(`${paths.api}/${user.id}`);
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
    // Chairs manage faculty only; other chairs in the department are listed read-only
    const canManage = (user: User) => !isChair || roleOf(user) === 'faculty';
    const chairsFull = !isChair && formData.department_id !== '' && chairCount(formData.department_id) >= MAX_CHAIRS;
    const departmentName = me?.department?.name ?? 'your department';

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2>{isChair ? `${departmentName} Members` : 'Members'}</h2>
                    <p className="text-muted">
                        {isChair
                            ? 'Add, edit and remove faculty in your department. Only the workspace admin can add program chairs.'
                            : 'Members sign in with Google. New sign-ups appear here as pending'}
                        {pendingCount > 0 && <> — <strong style={{ color: 'var(--warning)' }}>{pendingCount} sign-up{pendingCount === 1 ? '' : 's'} waiting for approval</strong></>}
                        {!isChair && '.'}
                    </p>
                </div>
                <Button onClick={() => openModal('add')}>
                    <UserPlus size={18} /> {isChair ? 'Add Faculty' : 'Add Member'}
                </Button>
            </div>

            {!isChair && departments.length === 0 && (
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
                                    <p style={{ fontWeight: 600 }}>{user.name}{user.id === me?.id && <span className="text-muted" style={{ fontWeight: 400 }}> (you)</span>}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</p>
                                </td>
                                <td data-label="Role"><span className="badge badge-approved" style={{ textTransform: 'uppercase' }}>{ROLE_LABELS[roleOf(user)] || 'No Role'}</span></td>
                                <td data-label="Department">{user.department?.name || (roleOf(user) === 'admin' ? 'All (Admin)' : '—')}</td>
                                <td data-label="Status">
                                    {user.status === 'pending' ? (
                                        <span className="badge badge-pending">PENDING</span>
                                    ) : (
                                        <span className="badge badge-approved">ACTIVE</span>
                                    )}
                                </td>
                                <td data-label="Action">
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {canManage(user) && (user.status === 'pending' ? (
                                            <Button variant="success" size="sm" onClick={() => openModal('approve', user)} disabled={deletingId === user.id}>
                                                <Check size={16} /> Approve
                                            </Button>
                                        ) : (
                                            <Button variant="secondary" size="icon" onClick={() => openModal('edit', user)} title="Edit" aria-label="Edit" disabled={deletingId === user.id}>
                                                <Edit2 size={16} />
                                            </Button>
                                        ))}
                                        {roleOf(user) === 'faculty' && user.status !== 'pending' && (
                                            <Link href={`${paths.pages}/${user.id}/submissions`} className="btn btn-secondary btn-icon" title="View submissions" aria-label="View submissions">
                                                <FileText size={16} />
                                            </Link>
                                        )}
                                        {canManage(user) && (
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
                                        )}
                                        {!canManage(user) && <span className="text-muted" style={{ fontSize: '0.8rem' }}>Managed by admin</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p className="text-muted">No members yet.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                open={modalMode !== null}
                onClose={closeModal}
                locked={saving}
                title={modalMode ? { add: isChair ? 'Add Faculty' : 'Add Member', edit: 'Edit Member', approve: 'Approve Sign-up' }[modalMode] : ''}
                description={
                    modalMode === 'add' ? 'They will get an email invitation and sign in with the Google account for this address. No password needed.'
                        : modalMode === 'approve'
                            ? (isChair ? `They will join ${departmentName} as faculty and be notified by email.` : 'Choose their role and department, then approve. They will be notified by email.')
                            : 'Change this member\'s details. They will be notified by email.'
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
                        {isChair ? (
                            <div className="input-group">
                                <label>Role &amp; Department</label>
                                <input type="text" readOnly disabled value={`Faculty · ${departmentName}`} />
                            </div>
                        ) : (
                            <>
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
                                {formData.role === 'program_chair' && formData.department_id && (
                                    <div className={`notice ${chairsFull ? 'notice-error' : 'notice-warning'}`} style={{ marginBottom: '1rem' }}>
                                        {chairsFull
                                            ? `This department already has ${MAX_CHAIRS} program chairs. Change one of them to another role first.`
                                            : `${chairCount(formData.department_id)} of ${MAX_CHAIRS} program chair slots used in this department.`}
                                    </div>
                                )}
                            </>
                        )}
                    </fieldset>
                    <div className="ui-dialog-footer">
                        <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
                        <Button type="submit" variant={modalMode === 'approve' ? 'success' : 'primary'} loading={saving} disabled={formData.role === 'program_chair' && chairsFull}>
                            {modalMode === 'approve'
                                ? <><Check size={18} /> {saving ? 'Approving…' : 'Approve'}</>
                                : <><Save size={18} /> {saving ? 'Saving…' : modalMode === 'add' ? (isChair ? 'Add Faculty' : 'Add Member') : 'Save Changes'}</>}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
