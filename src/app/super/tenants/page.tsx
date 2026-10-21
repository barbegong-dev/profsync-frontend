'use client';

import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/lib/api';
import { Plus, Save, Building2, Pause, Play, Copy } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast, confirmDialog } from '@/components/ui/feedback';

interface Tenant {
    id: number;
    name: string;
    slug: string;
    status: 'active' | 'suspended';
    users_count: number;
    admin_email: string | null;
    created_at: string;
}

const emptyForm = { name: '', slug: '', admin_name: '', admin_email: '', admin_password: '' };

const slugify = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function SuperTenants() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [slugTouched, setSlugTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/api/super/tenants');
            setTenants(res.data);
        } catch (error) {
            toast.error('Could not load tenants', getErrorMessage(error, 'Please refresh the page.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const openModal = () => {
        setForm(emptyForm);
        setSlugTouched(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            await api.post('/api/super/tenants', form);
            toast.success('Tenant created', `Workspace "${form.slug}" is ready. A welcome email was sent to ${form.admin_email}.`);
            setIsModalOpen(false);
            fetchTenants();
        } catch (error) {
            toast.error('Could not create tenant', getErrorMessage(error, 'Failed to create tenant.'));
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (tenant: Tenant) => {
        const suspending = tenant.status === 'active';
        const ok = await confirmDialog({
            title: suspending ? `Suspend ${tenant.name}?` : `Reactivate ${tenant.name}?`,
            description: suspending
                ? 'Nobody in this workspace will be able to sign in until it is reactivated. Its data is kept. The workspace admin is notified by email.'
                : 'Members will be able to sign in again. The workspace admin is notified by email.',
            confirmText: suspending ? 'Suspend' : 'Reactivate',
            destructive: suspending,
        });
        if (!ok) return;

        setTogglingId(tenant.id);
        try {
            await api.put(`/api/super/tenants/${tenant.id}`, { name: tenant.name, status: suspending ? 'suspended' : 'active' });
            toast.success(suspending ? 'Tenant suspended' : 'Tenant reactivated', tenant.name);
            fetchTenants();
        } catch (error) {
            toast.error('Could not update tenant', getErrorMessage(error, 'Failed to update tenant.'));
        } finally {
            setTogglingId(null);
        }
    };

    const copyLink = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/login?workspace=${slug}`);
            toast.success('Sign-in link copied');
        } catch {
            toast.error('Could not copy the link');
        }
    };

    if (loading) return <div>Loading tenants...</div>;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <h2>Tenants</h2>
                    <p className="text-muted">Each tenant is an institution with its own isolated workspace.</p>
                </div>
                <Button onClick={openModal}>
                    <Plus size={18} /> New Tenant
                </Button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tenant</th>
                            <th>Workspace</th>
                            <th>Admin</th>
                            <th>Users</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map(t => (
                            <tr key={t.id}>
                                <td data-label="Tenant" style={{ fontWeight: 600 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={16} color="var(--primary)" /> {t.name}</span>
                                </td>
                                <td data-label="Workspace"><code>{t.slug}</code></td>
                                <td data-label="Admin">{t.admin_email || '—'}</td>
                                <td data-label="Users">{t.users_count}</td>
                                <td data-label="Status">
                                    <span className={`badge ${t.status === 'active' ? 'badge-approved' : 'badge-rejected'}`}>{t.status.toUpperCase()}</span>
                                </td>
                                <td data-label="Action">
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button variant="secondary" size="icon" onClick={() => copyLink(t.slug)} title="Copy sign-in link" aria-label="Copy sign-in link">
                                            <Copy size={16} />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            onClick={() => toggleStatus(t)}
                                            loading={togglingId === t.id}
                                            title={t.status === 'active' ? 'Suspend' : 'Reactivate'}
                                            aria-label={t.status === 'active' ? 'Suspend' : 'Reactivate'}
                                        >
                                            {t.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                locked={saving}
                title="New Tenant"
                description="Creates an isolated workspace and its administrator. The admin gets a welcome email; share the temporary password with them separately."
            >
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={saving} style={{ border: 'none' }}>
                        <div className="input-group">
                            <label>Institution Name</label>
                            <input type="text" required placeholder="e.g. PRMSU Iba" value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })} />
                        </div>
                        <div className="input-group">
                            <label>Workspace name (users type this to sign in)</label>
                            <input type="text" required placeholder="e.g. prmsu-iba" value={form.slug}
                                onChange={e => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }} />
                        </div>
                        <h4 style={{ margin: '0.5rem 0 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant administrator</h4>
                        <div className="input-group">
                            <label>Admin Name</label>
                            <input type="text" required value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Admin Email</label>
                            <input type="email" required value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Temporary Password (min. 8 characters)</label>
                            <input type="text" required minLength={8} value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} />
                        </div>
                    </fieldset>
                    <div className="ui-dialog-footer">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancel</Button>
                        <Button type="submit" loading={saving}>
                            <Save size={18} /> {saving ? 'Creating…' : 'Create Tenant'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
