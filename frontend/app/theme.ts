// app/theme.ts
'use client';

import { createTheme } from '@mui/material/styles';

// カスタムグラデーション定義
export const gradients = {
    primary: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
    secondary: 'linear-gradient(135deg, #dc004e 0%, #c51162 100%)',
    success: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
    error: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
    info: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
    warning: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
    purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#dc004e',
            light: '#ff5983',
            dark: '#9a0036',
            contrastText: '#ffffff',
        },
        success: {
            main: '#4caf50',
            light: '#80e27e',
            dark: '#087f23',
            contrastText: '#ffffff',
        },
        error: {
            main: '#f44336',
            light: '#ff7961',
            dark: '#ba000d',
            contrastText: '#ffffff',
        },
        warning: {
            main: '#ff9800',
            light: '#ffb74d',
            dark: '#f57c00',
            contrastText: 'rgba(0, 0, 0, 0.87)',
        },
        info: {
            main: '#2196f3',
            light: '#64b5f6',
            dark: '#1976d2',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
        text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
            disabled: 'rgba(0, 0, 0, 0.38)',
        },
        divider: 'rgba(0, 0, 0, 0.12)',
        action: {
            hover: 'rgba(0, 0, 0, 0.04)',
            selected: 'rgba(0, 0, 0, 0.08)',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 600,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.5,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.6,
        },
        subtitle1: {
            fontSize: '1rem',
            fontWeight: 500,
            lineHeight: 1.75,
        },
        subtitle2: {
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: 1.57,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.43,
        },
        caption: {
            fontSize: '0.75rem',
            lineHeight: 1.66,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 8,
    },
    spacing: 8,
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    padding: '8px 16px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                contained: {
                    '&:hover': {
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    },
                },
                sizeSmall: {
                    padding: '4px 10px',
                    fontSize: '0.8125rem',
                },
                sizeLarge: {
                    padding: '11px 24px',
                    fontSize: '0.9375rem',
                },
            },
        },
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundImage: 'none',
                },
                elevation0: {
                    boxShadow: 'none',
                },
                elevation1: {
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                },
                elevation2: {
                    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: 'none',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 6,
                },
                sizeSmall: {
                    height: 24,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                },
                sizeMedium: {
                    height: 32,
                    fontSize: '0.8125rem',
                },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    '& .MuiTableCell-head': {
                        fontWeight: 700,
                        backgroundColor: '#fafafa',
                        color: 'rgba(0, 0, 0, 0.87)',
                    },
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    padding: '16px',
                },
                head: {
                    fontWeight: 700,
                    fontSize: '0.875rem',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:last-child td': {
                        borderBottom: 0,
                    },
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                },
                sizeSmall: {
                    padding: 4,
                },
                sizeMedium: {
                    padding: 8,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: 48,
                    '&.Mui-selected': {
                        fontWeight: 700,
                    },
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: 48,
                },
                indicator: {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                },
            },
        },
        MuiAvatar: {
            styleOverrides: {
                root: {
                    fontWeight: 700,
                },
            },
        },
        MuiDivider: {
            styleOverrides: {
                root: {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                    },
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                },
            },
        },
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontWeight: 700,
                    fontSize: '1.25rem',
                },
            },
        },
    },
});

// テーマ拡張用のヘルパー関数
export const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    const statusMap: { [key: string]: 'success' | 'error' | 'warning' | 'info' | 'default' } = {
        ACTIVE: 'success',
        INACTIVE: 'default',
        DISCONTINUED: 'error',
        DEVELOPMENT: 'warning',
        PENDING: 'info',
    };
    return statusMap[status] || 'default';
};

export const getBranchTypeColor = (branchType: string): 'primary' | 'secondary' | 'info' | 'warning' | 'default' => {
    const colors: { [key: string]: 'primary' | 'secondary' | 'info' | 'warning' | 'default' } = {
        HEAD_OFFICE: 'primary',
        BRANCH: 'secondary',
        SALES_OFFICE: 'info',
        FACTORY: 'warning',
        WAREHOUSE: 'info',
        OTHER: 'default',
    };
    return colors[branchType] || 'default';
};

export default theme;