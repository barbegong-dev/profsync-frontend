'use client';

import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/lib/api';
import { Plus, Trash2, Edit2, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast, confirmDialog } from '@/components/ui/feedback';

interface Department {
    id: number;
    name: string;
    users_count: number;
}

export default function AdminDepartments() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Department | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/api/departments');
            setDepartments(res.data);
        } catch (error) {
            toast.error('Could not load departments', getErrorMessage(error, 'Please refresh the page.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const openModal = (dept: Department | null = null) => {
        setEditing(dept);
        setName(dept?.name ?? '');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/api/admin/departments/${editing.id}`, { name });
            } else {
                await api.post('/api/admin/departments', { name });
            }
            toast.success(editing ? 'Department renamed' : 'Department added', name);
            setIsModalOpen(false);
            fetchDepartments();
        } catch (error) {
            toast.error('Could not save department', getErrorMessage(error, 'Operation failed.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (dept: Department) => {
        const ok = await confirmDialog({
            title: `Delete ${dept.name}?`,
            description: 'This cannot be undone. Departments that still have members cannot be deleted.',
            confirmText: 'Delete',
            destructive: true,
        });
        if (!ok) return;

        setDeletingId(dept.id);
        try {
            await api.delete(`/api/admin/departments/${dept.id}`);
            toast.success('Department deleted', dept.name);
            fetchDepartments();
        } catch (error) {
            toast.error('Could not delete department', getErrorMessage(error, 'Failed to delete department.'));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return <div>Loading departments...</div>;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2>Departments</h2>
                    <p className="text-muted">Departments or programs your members belong to.</p>
                </div>
                <Button onClick={() => openModal()}>
                    <Plus size={18} /> Add Department
                </Button>
            </div>

            {departments.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    No departments yet. Add your first one, e.g. &quot;Computer Science&quot;.
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>Members</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map(dept => (
                                <tr key={dept.id}>
                                    <td data-label="Department" style={{ fontWeight: 600 }}>{dept.name}</td>
                                    <td data-label="Members">{dept.users_count}</td>
                                    <td data-label="Action">
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Button variant="secondary" size="icon" onClick={() => openModal(dept)} title="Rename" aria-label="Rename" disabled={deletingId === dept.id}>
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button variant="destructive" size="icon" onClick={() => handleDelete(dept)} loading={deletingId === dept.id} title="Delete" aria-label="Delete">
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

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} locked={saving} title={editing ? 'Rename Department' : 'Add Department'} maxWidth={440}>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Department Name</label>
                        <input type="text" required autoFocus placeholder="e.g. Computer Science" value={name} onChange={e => setName(e.target.value)} disabled={saving} />
                    </div>
                    <div className="ui-dialog-footer">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
                        <Button type="submit" loading={saving}>
                            <Save size={18} /> {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
