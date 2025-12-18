// components/layout/MainLayout.tsx
'use client'

import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';

interface MainLayoutProps {
    children: React.ReactNode;
}

/**
 * メインレイアウトコンポーネント
 * AuthGuardとSidebarを組み合わせた共通レイアウト
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <AuthGuard>
            <Sidebar>
                {children}
            </Sidebar>
        </AuthGuard>
    );
};

export default MainLayout;
