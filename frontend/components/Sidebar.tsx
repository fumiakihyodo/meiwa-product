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
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';

const drawerWidth = 240;

interface SidebarProps {
    children: React.ReactNode;
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

    const [masterOpen, setMasterOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar-master-open');
            return saved !== null ? JSON.parse(saved) : true;
        }
        return true;
    });

    const { isAdmin } = useAuth();
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-master-open', JSON.stringify(masterOpen));
        }
    }, [masterOpen]);

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

    const handleMasterToggle = () => {
        setMasterOpen(!masterOpen);
    };

    const menuItems = [
        {
            text: 'ダッシュボード',
            icon: <DashboardIcon />,
            path: '/dashboard',
            show: true,
        },
        {
            text: '一括登録',
            icon: <CloudUploadIcon />,
            path: '/bulk-import',
            show: true,
        },
        {
            text: '支給品在庫管理',
            icon: <Inventory2Icon />,
            path: '/supplied-item-inventory',
            show: true,
        },
        {
            text: '購入品管理',
            icon: <ShoppingBagIcon />,
            path: '/purchased-item-inventory',
            show: true,
        },
        {
            text: 'ユーザー管理',
            icon: <PeopleIcon />,
            path: '/users',
            show: isAdmin,
        },
    ];

    const supplierMenuItems = [
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
    ];

    const customerMenuItems = [
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
    ];

    const masterMenuItems = [
        {
            text: '製品管理',
            icon: <InventoryIcon />,
            path: '/products',
        },
        {
            text: '部品管理',
            icon: <ShoppingCartIcon />,
            path: '/parts',
        },
    ];

    const drawer = (
        <>
            <Toolbar>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', py: 1 }}>
                    {/* TODO: 企業ロゴ画像のパスを設定してください */}
                    {/* 例: <Box component="img" src="/logo.png" alt="企業ロゴ" sx={{ height: 40, objectFit: 'contain' }} /> */}
                    <Typography variant='h6' noWrap component='div' sx={{ fontWeight: 'bold' }}>
                        Meiwa Product
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />

            {/* メインメニュー */}
            <List>
                {menuItems
                    .filter((item) => item.show)
                    .map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                selected={pathname === item.path}
                                onClick={() => handleNavigation(item.path)}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
            </List>
            <Divider />

            {/* マスタ管理 */}
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleMasterToggle}>
                        <ListItemIcon>
                            <InventoryIcon />
                        </ListItemIcon>
                        <ListItemText primary="マスタ管理" />
                        {masterOpen ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                </ListItem>
                <Collapse in={masterOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {masterMenuItems.map((item) => (
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
                    < Divider/>
                    {/* カスタマー管理 */}
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleCustomerToggle}>
                                <ListItemIcon>
                                    <PersonOutlineIcon />
                                </ListItemIcon>
                                <ListItemText primary="顧客管理" />
                                {customerOpen ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                        </ListItem>
                        <Collapse in={customerOpen} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                                {customerMenuItems.map((item) => (
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
                    <Divider />
                    {/* サプライヤー管理 */}
                    <List>
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleSupplierToggle}>
                                <ListItemIcon>
                                    <BusinessIcon />
                                </ListItemIcon>
                                <ListItemText primary="仕入先管理" />
                                {supplierOpen ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                        </ListItem>
                        <Collapse in={supplierOpen} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                                {supplierMenuItems.map((item) => (
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
                </Collapse>
            </List>
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