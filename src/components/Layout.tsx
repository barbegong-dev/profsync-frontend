'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    CheckSquare,
    BarChart2,
    Users,
    Settings,
    LogOut,
    LayoutDashboard,
    Menu,
    ArrowLeft,
    User,
    Building2,
    CalendarDays,
    Rocket,
    Layers
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import NotificationBell from '@/components/NotificationBell';

const PUBLIC_PATHS = ['/', '/login', '/register'];

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    dean: 'Dean',
    program_chair: 'Program Chair',
    faculty: 'Faculty',
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isPublic = PUBLIC_PATHS.includes(pathname);

    // Send signed-out visitors of protected pages to sign in
    useEffect(() => {
        if (!loading && !user && !isPublic) {
            router.replace('/login');
        }
    }, [loading, user, isPublic, router]);

    if (loading) return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
        }}>
            <style jsx>{`
                @keyframes logoPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.85; }
                }
                @keyframes dotBounce {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            <div style={{ animation: 'logoPulse 2s ease-in-out infinite' }}>
                <BrandLogo size="lg" />
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                    <div key={i} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                    }} />
                ))}
            </div>
        </div>
    );
    if (!user && !isPublic) return null; // Redirecting to /login

    const getNavItems = () => {
        const items = [];
        const roles = user?.roles.map(r => r.name) || [];

        if (roles.includes('super_admin')) {
            items.push({ name: 'Tenants', icon: Layers, href: '/super/tenants' });
        }
        if (roles.includes('faculty')) {
            items.push({ name: 'Dashboard', icon: LayoutDashboard, href: '/faculty/dashboard' });
        }
        if (roles.includes('program_chair')) {
            items.push({ name: 'Review Submissions', icon: CheckSquare, href: '/chair/dashboard' });
        }
        if (roles.includes('dean')) {
            items.push({ name: 'Compliance Reports', icon: BarChart2, href: '/dean/reports' });
        }
        if (roles.includes('admin')) {
            items.push({ name: 'Setup Guide', icon: Rocket, href: '/admin/setup' });
            items.push({ name: 'Members', icon: Users, href: '/admin/users' });
            items.push({ name: 'Departments', icon: Building2, href: '/admin/departments' });
            items.push({ name: 'Semesters', icon: CalendarDays, href: '/admin/semesters' });
            items.push({ name: 'Requirements', icon: Settings, href: '/admin/requirements' });
        }

        return items;
    };

    const navItems = getNavItems();
    const roleName = user?.roles[0]?.name ?? '';

    if (isPublic) return <>{children}</>;

    return (
        <div className="app-container">
            {/* Mobile Header */}
            <header className="mobile-header">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="btn btn-ghost btn-icon"
                    aria-label="Open menu"
                >
                    <Menu size={24} color="var(--text)" />
                </button>
                <BrandLogo size="sm" />
                <NotificationBell />
            </header>

            {/* Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                <div style={{ marginBottom: '2rem' }}>
                    {/* Sidebar Header (Mobile Only Close Button) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2rem',
                    }}>
                        {/* Desktop Logo */}
                        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BrandLogo size="sm" />
                        </div>

                        {/* Mobile Close Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="mobile-close-btn"
                        >
                            <ArrowLeft size={20} /> <span style={{ fontSize: '0.875rem' }}>Back</span>
                        </button>
                    </div>

                    {/* Profile Section (Centered like image) */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem',
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            {user?.name.charAt(0)}
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{user?.name}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 500 }}>{ROLE_LABELS[roleName] ?? roleName}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.department?.name || (roleName === 'super_admin' ? 'All workspaces' : '')}</p>
                        {user?.tenant && (
                            <div className="workspace-chip" style={{ marginTop: '0.75rem' }}><Building2 size={13} /> {user.tenant.name}</div>
                        )}
                    </div>

                    {/* Action Buttons (Profile, Logout, Pill style) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                        <Link href="/profile" className="btn btn-primary btn-full" style={{ borderRadius: '9999px', textDecoration: 'none', justifyContent: 'center' }}>
                            <User size={16} /> Profile
                        </Link>
                        <button onClick={logout} className="btn btn-secondary btn-full" style={{ borderRadius: '9999px', justifyContent: 'center' }}>
                            <LogOut size={16} /> Log out
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav style={{ flex: 1 }}>
                        <ul style={{ listStyle: 'none' }}>
                            {navItems.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <item.icon size={20} />
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Footer Info */}
                <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <p>ProfSync v1.0.0</p>
                </div>
            </aside>

            <main className="main-content">
                <header className="desktop-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ marginBottom: '0.25rem', fontSize: '1.75rem' }}>{navItems.find(i => i.href === pathname)?.name || 'Welcome'}</h1>
                        <p className="text-muted">Signed in as {ROLE_LABELS[roleName] ?? roleName}{user?.tenant ? ` · ${user.tenant.name}` : ''}</p>
                    </div>
                    <NotificationBell />
                </header>
                <div className="fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
