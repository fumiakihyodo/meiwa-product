'use client'

import React, { useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Button,
    Alert,
    AlertTitle,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    useTheme,
    alpha,
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Download as DownloadIcon,
    InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import apiClient from '@/services/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';

interface ImportError {
    row: number;
    error: string | object;
}

interface ImportResult {
    success: boolean;
    message: string;
    success_count: number;
    errors: ImportError[];
    created_items?: Record<string, unknown>[];
}

// 削除された項目: customer_branches, supplier_branches, price_histories
// 顧客・仕入先は拠点情報を統合、価格履歴は部品登録時に初期価格として設定
type ImportType = 'customers' | 'customer_contacts' |
                 'suppliers' | 'supplier_contacts' |
                 'products' | 'parts';

const IMPORT_CONFIGS: Record<ImportType, { label: string; description: string; templateUrl: string; importUrl: string }> = {
    customers: {
        label: '顧客',
        description: '顧客情報と拠点情報を同時に登録できます',
        templateUrl: 'customers/csv-template/',
        importUrl: 'customers/bulk-import/'
    },
    customer_contacts: {
        label: '顧客担当者',
        description: '顧客拠点に紐づく担当者情報を登録します',
        templateUrl: 'customers/contacts/csv-template/',
        importUrl: 'customers/contacts/bulk-import/'
    },
    suppliers: {
        label: '仕入先',
        description: '仕入先情報と拠点情報を同時に登録できます',
        templateUrl: 'supplier/suppliers/csv-template/',
        importUrl: 'supplier/suppliers/bulk-import/'
    },
    supplier_contacts: {
        label: '仕入先担当者',
        description: '仕入先拠点に紐づく担当者情報を登録します',
        templateUrl: 'supplier/contacts/csv-template/',
        importUrl: 'supplier/contacts/bulk-import/'
    },
    products: {
        label: '製品',
        description: '製品マスタを登録します',
        templateUrl: 'products/csv-template/',
        importUrl: 'products/bulk-import/'
    },
    parts: {
        label: '部品',
        description: '部品情報と初期価格を同時に登録できます',
        templateUrl: 'purchases/parts/csv-template/',
        importUrl: 'purchases/parts/bulk-import/'
    }
};

// ドラッグ&ドロップ対応のファイルアップロードコンポーネント
interface FileDropZoneProps {
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    disabled?: boolean;
}

function FileDropZone({ onFileSelect, selectedFile, disabled }: FileDropZoneProps) {
    const theme = useTheme();
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragActive(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (disabled) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.csv')) {
                onFileSelect(file);
            } else {
                alert('CSVファイルのみアップロード可能です');
            }
        }
    }, [disabled, onFileSelect]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    }, [onFileSelect]);

    return (
        <Box
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            sx={{
                border: '2px dashed',
                borderColor: isDragActive
                    ? theme.palette.primary.main
                    : selectedFile
                    ? theme.palette.success.main
                    : theme.palette.grey[400],
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                backgroundColor: isDragActive
                    ? alpha(theme.palette.primary.main, 0.08)
                    : selectedFile
                    ? alpha(theme.palette.success.main, 0.04)
                    : theme.palette.background.paper,
                transition: 'all 0.2s ease-in-out',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                '&:hover': disabled ? {} : {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                }
            }}
        >
            {selectedFile ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <FileIcon color="success" fontSize="large" />
                    <Box>
                        <Typography variant="body1" fontWeight="bold" color="success.main">
                            {selectedFile.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <>
                    <UploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                        CSVファイルをドラッグ＆ドロップ
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        または
                    </Typography>
                </>
            )}

            <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                disabled={disabled}
                sx={{ mt: 2 }}
            >
                {selectedFile ? 'ファイルを変更' : 'ファイルを選択'}
                <input
                    type="file"
                    accept=".csv"
                    hidden
                    onChange={handleFileInputChange}
                />
            </Button>
        </Box>
    );
}

export default function BulkImportPage() {
    const theme = useTheme();
    const [selectedTab, setSelectedTab] = useState<ImportType>('customers');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleFileSelect = useCallback((selectedFile: File) => {
        setFile(selectedFile);
        setResult(null);
    }, []);

    const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: ImportType) => {
        setSelectedTab(newValue);
        setFile(null);
        setResult(null);
    }, []);

    const handleDownloadTemplate = async () => {
        try {
            const config = IMPORT_CONFIGS[selectedTab];

            const response = await apiClient.get(config.templateUrl, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8-sig' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedTab}_template.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('テンプレートのダウンロード中にエラーが発生しました');
        }
    };

    const handleImport = async () => {
        if (!file) {
            alert('CSVファイルを選択してください');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const config = IMPORT_CONFIGS[selectedTab];

            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post(config.importUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);

            if (response.data.success) {
                setFile(null);
            }
        } catch (error: unknown) {
            console.error('Import error:', error);
            interface AxiosError {
                response?: {
                    data?: ImportResult;
                };
            }
            const axiosError = error as AxiosError;
            if (axiosError.response?.data) {
                setResult(axiosError.response.data);
            } else {
                setResult({
                    success: false,
                    message: 'インポート中にエラーが発生しました',
                    success_count: 0,
                    errors: []
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const formatError = (error: string | object): string => {
        if (typeof error === 'string') {
            return error;
        }
        return JSON.stringify(error, null, 2);
    };

    const currentConfig = IMPORT_CONFIGS[selectedTab];

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Typography variant="h4" gutterBottom>
                        一括登録
                    </Typography>

                    <Paper sx={{ mt: 3, overflow: 'hidden' }}>
                        {/* タブ - 視認性向上 */}
                        <Box
                            sx={{
                                borderBottom: 3,
                                borderColor: 'primary.main',
                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                            }}
                        >
                            <Tabs
                                value={selectedTab}
                                onChange={handleTabChange}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{
                                    '& .MuiTab-root': {
                                        fontWeight: 500,
                                        fontSize: '0.95rem',
                                        minHeight: 56,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        },
                                    },
                                    '& .Mui-selected': {
                                        fontWeight: 700,
                                        color: `${theme.palette.primary.main} !important`,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                    },
                                    '& .MuiTabs-indicator': {
                                        height: 4,
                                        borderRadius: '4px 4px 0 0',
                                    },
                                }}
                            >
                                {Object.entries(IMPORT_CONFIGS).map(([key, config]) => (
                                    <Tab key={key} label={config.label} value={key} />
                                ))}
                            </Tabs>
                        </Box>

                        {/* タブコンテンツ */}
                        <Box sx={{ p: 3 }}>
                            {/* 説明カード */}
                            <Card
                                sx={{
                                    mb: 3,
                                    backgroundColor: alpha(theme.palette.info.main, 0.04),
                                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                }}
                            >
                                <CardContent>
                                    <Typography variant="h6" gutterBottom color="primary">
                                        {currentConfig.label}の一括登録
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {currentConfig.description}
                                    </Typography>
                                    <Typography variant="body2" component="div" color="text.secondary">
                                        <strong>手順：</strong>
                                        <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                            <li>CSVテンプレートをダウンロード</li>
                                            <li>テンプレートに登録するデータを入力</li>
                                            <li>CSVファイルをアップロード（ドラッグ&ドロップ可能）</li>
                                            <li>「インポート」ボタンをクリック</li>
                                        </ol>
                                    </Typography>
                                </CardContent>
                            </Card>

                            {/* テンプレートダウンロードボタン */}
                            <Box sx={{ mb: 3 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<DownloadIcon />}
                                    onClick={handleDownloadTemplate}
                                    size="large"
                                >
                                    CSVテンプレートをダウンロード
                                </Button>
                            </Box>

                            {/* ドラッグ&ドロップエリア */}
                            <FileDropZone
                                onFileSelect={handleFileSelect}
                                selectedFile={file}
                                disabled={loading}
                            />

                            {/* インポートボタン */}
                            {file && (
                                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        onClick={handleImport}
                                        disabled={loading}
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                                    >
                                        {loading ? 'インポート中...' : 'インポート実行'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="inherit"
                                        size="large"
                                        onClick={() => {
                                            setFile(null);
                                            setResult(null);
                                        }}
                                        disabled={loading}
                                    >
                                        キャンセル
                                    </Button>
                                </Box>
                            )}

                            {/* 結果表示 */}
                            {result && (
                                <Box sx={{ mt: 3 }}>
                                    <Alert
                                        severity={result.success ? 'success' : 'error'}
                                        sx={{ mb: 2 }}
                                    >
                                        <AlertTitle>
                                            {result.success ? '成功' : 'エラー'}
                                        </AlertTitle>
                                        {result.message}
                                        {result.success_count > 0 && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {result.success_count}件のデータを登録しました
                                            </Typography>
                                        )}
                                    </Alert>

                                    {result.errors && result.errors.length > 0 && (
                                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ backgroundColor: 'error.light' }}>
                                                        <TableCell sx={{ fontWeight: 'bold', color: 'error.contrastText', width: 80 }}>
                                                            行番号
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', color: 'error.contrastText' }}>
                                                            エラー内容
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {result.errors.map((error, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{error.row}</TableCell>
                                                            <TableCell>
                                                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                                                                    {formatError(error.error)}
                                                                </pre>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}

                                    {result.created_items && result.created_items.length > 0 && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="h6" gutterBottom>
                                                登録されたデータ
                                            </Typography>
                                            <TableContainer component={Paper}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: 'success.light' }}>
                                                            <TableCell sx={{ fontWeight: 'bold', color: 'success.contrastText', width: 80 }}>
                                                                行番号
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', color: 'success.contrastText' }}>
                                                                詳細
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {result.created_items.map((item, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>{String(item.row ?? '')}</TableCell>
                                                                <TableCell>
                                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                                                                        {JSON.stringify(item, null, 2)}
                                                                    </pre>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Sidebar>
        </AuthGuard>
    );
}
