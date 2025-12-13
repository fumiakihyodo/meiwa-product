'use client';

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface AuthGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (requireAdmin && !isAdmin) {
                router.push('/unauthorized');
            }
        }
    }, [isAuthenticated, isAdmin, loading, requireAdmin, router]);

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        )
    }

    if (!isAuthenticated || (requireAdmin && !isAdmin)) {
        return null;
    }

    return <>{children}</>
};
