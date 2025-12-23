// app/suppliers/contacts/new/page.tsx
'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import ContactFormPage from '../[id]/edit/page';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';

function LoadingFallback() {
    return (
        <AuthGuard>
            <Sidebar>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                    <CircularProgress />
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}

export default function NewSupplierContactPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ContactFormPage />
        </Suspense>
    );
}
