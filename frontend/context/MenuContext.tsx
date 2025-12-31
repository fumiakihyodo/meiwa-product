'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// メニューカテゴリの定義
export type MenuCategory = 'dashboard' | 'inventory' | 'master' | 'trading' | 'system';

// 各カテゴリの情報
export interface CategoryInfo {
    id: MenuCategory;
    name: string;
    description: string;
    color: string;
    icon: string;
}

export const MENU_CATEGORIES: CategoryInfo[] = [
    {
        id: 'inventory',
        name: '在庫管理',
        description: '支給品・購入品の在庫を管理',
        color: '#2196f3',
        icon: 'Inventory2',
    },
    {
        id: 'master',
        name: 'マスター管理',
        description: '製品・部品のマスターデータを管理',
        color: '#4caf50',
        icon: 'Inventory',
    },
    {
        id: 'trading',
        name: '取引先管理',
        description: '顧客・仕入先の情報を管理',
        color: '#ff9800',
        icon: 'Business',
    },
    {
        id: 'system',
        name: 'システム管理',
        description: 'ユーザー・一括登録などの管理',
        color: '#9c27b0',
        icon: 'Settings',
    },
];

// パスとカテゴリのマッピング
const PATH_TO_CATEGORY: Record<string, MenuCategory> = {
    '/dashboard': 'dashboard',
    '/supplied-item-inventory': 'inventory',
    '/purchased-item-inventory': 'inventory',
    '/products': 'master',
    '/parts': 'master',
    '/customers': 'trading',
    '/customers/branches': 'trading',
    '/customers/contacts': 'trading',
    '/suppliers': 'trading',
    '/suppliers/contacts': 'trading',
    '/suppliers/branches': 'trading',
    '/users': 'system',
    '/bulk-import': 'system',
    '/profile': 'dashboard',
};

interface MenuContextType {
    currentCategory: MenuCategory;
    setCurrentCategory: (category: MenuCategory) => void;
    getCategoryFromPath: (path: string) => MenuCategory;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const useMenu = (): MenuContextType => {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
};

interface MenuProviderProps {
    children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
    const pathname = usePathname();
    const [currentCategory, setCurrentCategory] = useState<MenuCategory>('dashboard');

    // パスからカテゴリを取得
    const getCategoryFromPath = (path: string): MenuCategory => {
        // 完全一致をまず確認
        if (PATH_TO_CATEGORY[path]) {
            return PATH_TO_CATEGORY[path];
        }
        // 前方一致で確認（/supplied-item-inventory/1 のようなケース）
        for (const [key, value] of Object.entries(PATH_TO_CATEGORY)) {
            if (path.startsWith(key)) {
                return value;
            }
        }
        return 'dashboard';
    };

    // パスが変更されたらカテゴリを更新
    useEffect(() => {
        if (pathname) {
            const category = getCategoryFromPath(pathname);
            // ダッシュボードに戻った場合は、localStorageから前回のカテゴリを復元しない
            // （ダッシュボードで明示的に選択できるようにする）
            if (category !== 'dashboard') {
                setCurrentCategory(category);
                localStorage.setItem('current-menu-category', category);
            } else if (pathname === '/dashboard') {
                // ダッシュボードページでは 'dashboard' カテゴリに設定
                setCurrentCategory('dashboard');
            }
        }
    }, [pathname]);

    // 初期ロード時にlocalStorageから復元
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('current-menu-category');
            if (saved && saved !== 'dashboard') {
                const category = getCategoryFromPath(pathname || '/dashboard');
                if (category !== 'dashboard') {
                    setCurrentCategory(category);
                }
            }
        }
    }, []);

    const handleSetCategory = (category: MenuCategory) => {
        setCurrentCategory(category);
        if (category !== 'dashboard') {
            localStorage.setItem('current-menu-category', category);
        }
    };

    const value = {
        currentCategory,
        setCurrentCategory: handleSetCategory,
        getCategoryFromPath,
    };

    return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};
