'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, homeFor } from '@/context/AuthContext';
import { Mail, Lock, Building2, ArrowRight, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import api, { getErrorMessage } from '@/lib/api';
import { getSavedWorkspace, saveWorkspace, Workspace } from '@/lib/workspace';
import BrandLogo from '@/components/BrandLogo';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type Step = 'workspace' | 'signin' | 'platform';

export default function LoginPage() {
    const { user, login, loginWithGoogle } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>('workspace');
    const [workspaceInput, setWorkspaceInput] = useState('');
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [showEmailLogin, setShowEmailLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [googleBusy, setGoogleBusy] = useState(false);
    const [error, setError] = useState('');
    const [pendingMessage, setPendingMessage] = useState('');

    const findWorkspace = async (name: string) => {
        setBusy(true);
        setError('');
        try {
            const res = await api.get(`/api/tenants/${encodeURIComponent(name.trim())}`);
            setWorkspace(res.data);
            saveWorkspace(res.data);
            setStep('signin');
        } catch (err) {
            setError(getErrorMessage(err, 'Workspace not found.'));
        } finally {
            setBusy(false);
        }
    };

    // Already signed in: go straight to the dashboard
    useEffect(() => {
        if (user) router.replace(homeFor(user));
    }, [user, router]);

    // Use ?workspace=slug from a shared link, otherwise the last workspace used on this device
    useEffect(() => {
        const fromLink = new URLSearchParams(window.location.search).get('workspace');
        if (fromLink) {
            setWorkspaceInput(fromLink);
            findWorkspace(fromLink);
            return;
        }
        const saved = getSavedWorkspace();
        if (saved) {
            setWorkspace(saved);
            setWorkspaceInput(saved.name);
            setStep('signin');
        }
    }, []);

    const goTo = (next: Step) => {
        setError('');
        setPendingMessage('');
        setShowEmailLogin(false);
        setStep(next);
    };

    const handleGoogle = async (credential: string) => {
        if (!workspace || googleBusy) return;
        setGoogleBusy(true);
        setError('');
        setPendingMessage('');
        try {
            const result = await loginWithGoogle(credential, workspace.slug);
            if (result.pending) {
                setPendingMessage(result.message || 'Your account is waiting for approval.');
            } else {
                toast.success('Signed in');
            }
        } catch (err) {
            setError(getErrorMessage(err, 'Google sign-in failed.'));
        } finally {
            setGoogleBusy(false);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await login({ email, password, tenant: step === 'signin' ? workspace?.slug : undefined });
            toast.success('Signed in');
        } catch (err) {
            setError(getErrorMessage(err, 'Invalid credentials'));
        } finally {
            setBusy(false);
        }
    };

    const passwordForm = (
        <form onSubmit={handlePasswordLogin} style={{ marginTop: '1rem' }}>
            <div className="input-group">
                <label><Mail size={14} style={{ marginRight: '0.5rem' }} /> Email Address</label>
                <input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="input-group">
                <label><Lock size={14} style={{ marginRight: '0.5rem' }} /> Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" full loading={busy}>
                {busy ? 'Signing in…' : 'Sign In'}
            </Button>
        </form>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card auth-card fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.75rem 2.25rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <BrandLogo size="md" />
                    </div>

                    {step === 'workspace' && <>
                        <h2 style={{ marginBottom: '0.5rem' }}>Find your workspace</h2>
                        <p className="text-muted">Enter your institution&apos;s workspace name to continue</p>
                    </>}
                    {step === 'signin' && workspace && <>
                        <div className="workspace-chip"><Building2 size={14} /> {workspace.name}</div>
                        <h2 style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>Welcome</h2>
                        <p className="text-muted">Sign in or create your account with Google</p>
                    </>}
                    {step === 'platform' && <>
                        <div className="workspace-chip"><ShieldCheck size={14} /> Platform administration</div>
                        <h2 style={{ marginBottom: '0.5rem', marginTop: '1rem' }}>Super Admin</h2>
                        <p className="text-muted">Sign in to manage workspaces</p>
                    </>}
                </div>

                {error && <div className="notice notice-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
                {pendingMessage && (
                    <div className="notice notice-success" style={{ marginBottom: '1.25rem' }}>
                        <Clock size={16} style={{ flexShrink: 0 }} /> {pendingMessage}
                    </div>
                )}

                {step === 'workspace' && (
                    <form onSubmit={(e) => { e.preventDefault(); findWorkspace(workspaceInput); }}>
                        <div className="input-group">
                            <label><Building2 size={14} style={{ marginRight: '0.5rem' }} /> Workspace</label>
                            <input
                                type="text"
                                placeholder="e.g. prmsu-castillejos"
                                value={workspaceInput}
                                onChange={(e) => setWorkspaceInput(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <Button type="submit" full loading={busy}>
                            {busy ? 'Looking up…' : <>Continue <ArrowRight size={16} /></>}
                        </Button>
                    </form>
                )}

                {step === 'signin' && (
                    <>
                        {googleBusy && (
                            <Button variant="secondary" full loading disabled>Signing you in…</Button>
                        )}
                        <div style={{ display: googleBusy ? 'none' : 'block' }}>
                            <GoogleSignInButton onCredential={handleGoogle} />
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
                            New here? Continue with Google and your administrator will approve your account.
                        </p>

                        <div className="divider"><span>or</span></div>

                        {showEmailLogin ? passwordForm : (
                            <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowEmailLogin(true)}>
                                <Lock size={16} /> Administrator sign in with email
                            </button>
                        )}

                        <button type="button" className="link-btn" onClick={() => { saveWorkspace(null); setWorkspace(null); goTo('workspace'); }}>
                            <ArrowLeft size={14} /> Use a different workspace
                        </button>
                    </>
                )}

                {step === 'platform' && (
                    <>
                        {passwordForm}
                        <button type="button" className="link-btn" onClick={() => goTo(workspace ? 'signin' : 'workspace')}>
                            <ArrowLeft size={14} /> Back to workspace sign in
                        </button>
                    </>
                )}

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem' }}>
                    {step !== 'platform' && (
                        <button type="button" className="link-btn" style={{ margin: '0 auto 0.75rem' }} onClick={() => goTo('platform')}>
                            <ShieldCheck size={14} /> ProfSync platform admin
                        </button>
                    )}
                    <p className="text-muted">ProfSync - Faculty Tracking Management System</p>
                </div>
            </div>
        </div>
    );
}
