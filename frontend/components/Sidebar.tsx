// components/Sidebar.tsx
'use client'

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from 'next/navigation';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Divider,
    IconButton,
    Typography,
    Box,
    Collapse,
    Chip,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    Inventory as InventoryIcon,
    Business as BusinessIcon,
    ShoppingCart as ShoppingCartIcon,
    ContactPhone as ContactPhoneIcon,
    Store as StoreIcon,
    PersonOutline as PersonOutlineIcon,
    ExpandLess,
    ExpandMore,
    CloudUpload as CloudUploadIcon,
    Inventory2 as Inventory2Icon,
    ShoppingBag as ShoppingBagIcon,
    Home as HomeIcon,
    Settings as SettingsIcon,
    PrecisionManufacturing as ManufacturingIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { useMenu, MenuCategory, MENU_CATEGORIES } from '@/context/MenuContext';
import { Header } from '@/components/Header';

const drawerWidth = 240;

interface SidebarProps {
    children: React.ReactNode;
}

// カテゴリ別のメニュー項目定義
interface MenuItem {
    text: string;
    icon: React.ReactNode;
    path: string;
    show?: boolean;
}

interface NestedMenuItem {
    text: string;
    icon: React.ReactNode;
    items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    // localStorageから初期状態を読み込む
    const [supplierOpen, setSupplierOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar-supplier-open');
            return saved !== null ? JSON.parse(saved) : true;
        }
        return true;
    });

    const [customerOpen, setCustomerOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar-customer-open');
            return saved !== null ? JSON.parse(saved) : true;
        }
        return true;
    });

    const { isAdmin } = useAuth();
    const { currentCategory } = useMenu();
    const router = useRouter();
    const pathname = usePathname();

    // 状態変更をlocalStorageに保存
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-supplier-open', JSON.stringify(supplierOpen));
        }
    }, [supplierOpen]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-customer-open', JSON.stringify(customerOpen));
        }
    }, [customerOpen]);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleNavigation = (path: string) => {
        router.push(path);
        setMobileOpen(false);
    };

    const handleSupplierToggle = () => {
        setSupplierOpen(!supplierOpen);
    };

    const handleCustomerToggle = () => {
        setCustomerOpen(!customerOpen);
    };

    // 現在のカテゴリ情報を取得
    const currentCategoryInfo = MENU_CATEGORIES.find(c => c.id === currentCategory);

    // カテゴリごとのメニュー定義
    const getMenuForCategory = (category: MenuCategory): { items: MenuItem[], nested?: NestedMenuItem[] } => {
        switch (category) {
            case 'inventory':
                return {
                    items: [
                        {
                            text: '在庫管理TOP',
                            icon: <Inventory2Icon />,
                            path: '/inventory',
                        },
                        {
                            text: '支給品在庫管理',
                            icon: <Inventory2Icon />,
                            path: '/inventory/supplied-item-inventory',
                        },
                        {
                            text: '購入品在庫管理',
                            icon: <ShoppingBagIcon />,
                            path: '/inventory/purchased-item-inventory',
                        },
                        {
                            text: '在庫調整',
                            icon: <Inventory2Icon />,
                            path: '/inventory/inventory-adjustment',
                        },
                    ],
                };
            case 'master':
                return {
                    items: [
                        {
                            text: '製品管理',
                            icon: <InventoryIcon />,
                            path: '/master/products',
                        },
                        {
                            text: '部品管理',
                            icon: <ShoppingCartIcon />,
                            path: '/master/parts',
                        },
                        {
                            text: '支給品管理',
                            icon: <ShoppingCartIcon />,
                            path: '/master/supplied-items',
                        },
                        {
                            text: '制作品管理',
                            icon: <ManufacturingIcon />,
                            path: '/master/manufacturing',
                        },
                        {
                            text: '材料管理',
                            icon: <Inventory2Icon />,
                            path: '/master/material',
                        },
                    ],
                };
            case 'trading':
                return {
                    items: [],
                    nested: [
                        {
                            text: '顧客管理',
                            icon: <PersonOutlineIcon />,
                            items: [
                                {
                                    text: '顧客一覧',
                                    icon: <PersonOutlineIcon />,
                                    path: '/customers',
                                },
                                {
                                    text: '顧客拠点',
                                    icon: <StoreIcon />,
                                    path: '/customers/branches',
                                },
                                {
                                    text: '顧客担当者',
                                    icon: <ContactPhoneIcon />,
                                    path: '/customers/contacts',
                                },
                            ],
                        },
                        {
                            text: '仕入先管理',
                            icon: <BusinessIcon />,
                            items: [
                                {
                                    text: '仕入先一覧',
                                    icon: <BusinessIcon />,
                                    path: '/suppliers',
                                },
                                {
                                    text: '仕入先担当者',
                                    icon: <ContactPhoneIcon />,
                                    path: '/suppliers/contacts',
                                },
                            ],
                        },
                    ],
                };
            case 'system':
                return {
                    items: [
                        {
                            text: 'ユーザー管理',
                            icon: <PeopleIcon />,
                            path: '/users',
                            show: isAdmin,
                        },
                        {
                            text: '一括登録',
                            icon: <CloudUploadIcon />,
                            path: '/bulk-import',
                        },
                    ].filter(item => item.show !== false),
                };
            case 'production':
                return {
                    items: [
                        {
                            text: '生産計画TOP',
                            icon: <ManufacturingIcon />,
                            path: '/production-planning',
                        },
                    ],
                };
            case 'dashboard':
            default:
                return {
                    items: [
                        {
                            text: 'ダッシュボード',
                            icon: <DashboardIcon />,
                            path: '/dashboard',
                        },
                    ],
                };
        }
    };

    const menuConfig = getMenuForCategory(currentCategory);

    const drawer = (
        <>
            <Toolbar>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', py: 1 }}>
                    <Typography variant='h6' noWrap component='div' sx={{ fontWeight: 'bold' }}>
                        Meiwa Product
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />

            {/* ダッシュボードに戻るボタン（ダッシュボード以外のカテゴリで表示） */}
            {currentCategory !== 'dashboard' && (
                <>
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => handleNavigation('/dashboard')}
                                sx={{
                                    backgroundColor: 'action.hover',
                                }}
                            >
                                <ListItemIcon>
                                    <HomeIcon />
                                </ListItemIcon>
                                <ListItemText primary="ダッシュボード" />
                            </ListItemButton>
                        </ListItem>
                    </List>
                    <Divider />
                </>
            )}

            {/* カテゴリヘッダー */}
            {currentCategory !== 'dashboard' && currentCategoryInfo && (
                <Box sx={{ px: 2, py: 1.5, backgroundColor: `${currentCategoryInfo.color}10` }}>
                    <Chip
                        icon={
                            currentCategory === 'inventory' ? <Inventory2Icon fontSize="small" /> :
                                currentCategory === 'master' ? <InventoryIcon fontSize="small" /> :
                                    currentCategory === 'production' ? <ManufacturingIcon fontSize="small" /> :
                                        currentCategory === 'trading' ? <BusinessIcon fontSize="small" /> :
                                            <SettingsIcon fontSize="small" />
                        }
                        label={currentCategoryInfo.name}
                        size="small"
                        sx={{
                            backgroundColor: currentCategoryInfo.color,
                            color: 'white',
                            fontWeight: 'bold',
                        }}
                    />
                </Box>
            )}

            {/* メインメニュー */}
            <List>
                {menuConfig.items.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={pathname === item.path || pathname?.startsWith(item.path + '/')}
                            onClick={() => handleNavigation(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* ネストメニュー（取引先管理用） */}
            {menuConfig.nested && menuConfig.nested.map((nestedMenu, index) => (
                <React.Fragment key={nestedMenu.text}>
                    {index > 0 && <Divider />}
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={nestedMenu.text === '顧客管理' ? handleCustomerToggle : handleSupplierToggle}
                            >
                                <ListItemIcon>
                                    {nestedMenu.icon}
                                </ListItemIcon>
                                <ListItemText primary={nestedMenu.text} />
                                {(nestedMenu.text === '顧客管理' ? customerOpen : supplierOpen) ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                        </ListItem>
                        <Collapse
                            in={nestedMenu.text === '顧客管理' ? customerOpen : supplierOpen}
                            timeout="auto"
                            unmountOnExit
                        >
                            <List component="div" disablePadding>
                                {nestedMenu.items.map((item) => (
                                    <ListItem key={item.text} disablePadding>
                                        <ListItemButton
                                            sx={{ pl: 4 }}
                                            selected={pathname === item.path}
                                            onClick={() => handleNavigation(item.path)}
                                        >
                                            <ListItemIcon>{item.icon}</ListItemIcon>
                                            <ListItemText primary={item.text} />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Collapse>
                    </List>
                </React.Fragment>
            ))}
        </>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            {/* App Bar for Mobile */}
            <Box
                component='nav'
                sx={{
                    width: { sm: drawerWidth },
                    flexShrink: { sm: 0 },
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    zIndex: 1200,
                    display: { xs: 'block', sm: 'none' },
                }}
            >
                <IconButton
                    color='inherit'
                    aria-label='open drawer'
                    edge='start'
                    onClick={handleDrawerToggle}
                    sx={{
                        ml: 2,
                        mt: 2,
                        display: { sm: 'none' },
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                            backgroundColor: 'primary.dark',
                        }
                    }}
                >
                    <MenuIcon />
                </IconButton>
            </Box>

            {/* Drawer for Mobile */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true,
                }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                    },
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', p: 1 }}>
                    <IconButton onClick={handleDrawerToggle}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Box>
                <Divider />
                {drawer}
            </Drawer>

            {/* Drawer for Desktop */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                    },
                }}
            >
                {drawer}
            </Drawer>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    mt: { xs: 8, sm: 0 },
                }}
            >
                {/* Header */}
                <Header />

                {/* Page Content */}
                {children}
            </Box>
        </Box>
    );
};
