'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Briefcase, Shield, Building2, Edit2, Save, Layers } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from '@/components/ui/feedback';

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    dean: 'Dean',
    program_chair: 'Program Chair',
    faculty: 'Faculty',
};

export default function ProfilePage() {
    const { user, loading, checkAuth } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: ''
    });

    if (loading) return <div>Loading profile...</div>;
    if (!user) return <div>Please log in to view profile.</div>;

    const roleName = user.roles?.[0]?.name ?? '';
    const role = ROLE_LABELS[roleName] ?? roleName;
    // Admins sign in with email + password; everyone else only with Google
    const usesPassword = roleName === 'admin' || roleName === 'super_admin';

    const openEditModal = () => {
        setFormData({ name: user.name, email: user.email, password: '', password_confirmation: '' });
        setIsEditing(true);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            await api.put('/api/user/profile', formData);
            await checkAuth();
            setIsEditing(false);
            toast.success('Profile updated', formData.password ? 'Your password was changed. A confirmation email was sent.' : undefined);
        } catch (error) {
            toast.error('Update failed', getErrorMessage(error, 'An error occurred while updating your profile.'));
        } finally {
            setSaving(false);
        }
    };

    const tiles = [
        { icon: Mail, label: usesPassword ? 'Email Address' : 'Google Account', value: user.email },
        { icon: Building2, label: 'Department', value: user.department?.name ?? (usesPassword ? 'All departments' : '—') },
        { icon: Shield, label: 'Role', value: role },
        ...(user.tenant ? [{ icon: Layers, label: 'Workspace', value: user.tenant.name }] : []),
        { icon: Briefcase, label: 'Account Status', value: 'Active' },
    ];

    return (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="profile-header">
                <Button variant="secondary" size="icon" onClick={openEditModal} title="Edit profile" aria-label="Edit profile" className="profile-edit">
                    <Edit2 size={18} />
                </Button>
                <div className="profile-avatar">{user.name.charAt(0)}</div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>{user.name}</h2>
                <span className="badge badge-approved" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{role}</span>
            </div>

            <div className="info-grid">
                {tiles.map(tile => (
                    <div key={tile.label} className="info-tile">
                        <div className="info-tile-label">
                            <tile.icon size={16} />
                            {tile.label}
                        </div>
                        <p className="info-tile-value">{tile.value}</p>
                    </div>
                ))}
            </div>

            {!usesPassword && (
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '1.5rem', textAlign: 'center' }}>
                    You sign in with Google, so there is no ProfSync password to manage.
                </p>
            )}

            <Modal open={isEditing} onClose={() => setIsEditing(false)} locked={saving} title="Edit Profile">
                <form onSubmit={handleUpdateProfile}>
                    <fieldset disabled={saving} style={{ border: 'none' }}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>

                        <div className="input-group">
                            <label>{usesPassword ? 'Email Address' : 'Google Account (cannot be changed)'}</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={!usesPassword}
                            />
                        </div>

                        {usesPassword && (
                            <>
                                <div className="input-group">
                                    <label>New Password (optional)</label>
                                    <input
                                        type="password"
                                        placeholder="Leave blank to keep current password"
                                        minLength={8}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={formData.password_confirmation}
                                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                        required={formData.password.length > 0}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </>
                        )}
                    </fieldset>

                    <div className="ui-dialog-footer">
                        <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</Button>
                        <Button type="submit" loading={saving}>
                            <Save size={18} /> {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
