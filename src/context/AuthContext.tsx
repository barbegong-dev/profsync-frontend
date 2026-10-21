'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export interface User {
    id: number;
    name: string;
    email: string;
    roles: { name: string }[];
    department?: { name: string } | null;
    tenant?: { name: string; slug: string } | null;
}

interface LoginCredentials {
    email: string;
    password: string;
    tenant?: string;
}

interface AuthResult {
    pending?: boolean;
    message?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    loginWithGoogle: (credential: string, tenant: string) => Promise<AuthResult>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

// Landing page for each role
export const homeFor = (user: User | null): string => {
    switch (user?.roles?.[0]?.name) {
        case 'super_admin':
            return '/super/tenants';
        case 'admin':
            return '/admin/setup';
        case 'dean':
            return '/dean/reports';
        case 'program_chair':
            return '/chair/dashboard';
        default:
            return '/faculty/dashboard';
    }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const response = await api.get('/api/user');
            setUser(response.data);
        } catch {
            setUser(null);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const completeSignIn = (token: string, signedIn: User) => {
        localStorage.setItem('token', token);
        setUser(signedIn);
        router.push(homeFor(signedIn));
    };

    const login = async (credentials: LoginCredentials) => {
        const response = await api.post('/api/login', credentials);
        if (!response.data.success) {
            throw new Error(response.data.message);
        }
        completeSignIn(response.data.token, response.data.user);
    };

    // Signs in an existing member, or creates a pending account for a new one
    const loginWithGoogle = async (credential: string, tenant: string): Promise<AuthResult> => {
        const response = await api.post('/api/auth/google', { credential, tenant });
        if (response.data.pending) {
            return { pending: true, message: response.data.message };
        }
        completeSignIn(response.data.token, response.data.user);
        return {};
    };

    const logout = async () => {
        try {
            await api.post('/api/logout');
        } catch {
            // Token may already be invalid; sign out locally anyway
        }
        localStorage.removeItem('token');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
