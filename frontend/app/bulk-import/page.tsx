'use client'

import React, { useState } from 'react';
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
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Download as DownloadIcon,
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
    created_items?: any[];
}

type ImportType = 'customers' | 'customer_branches' | 'customer_contacts' |
                 'suppliers' | 'supplier_branches' | 'supplier_contacts' |
                 'products' | 'parts' | 'price_histories';

const IMPORT_CONFIGS: Record<ImportType, { label: string; templateUrl: string; importUrl: string }> = {
    customers: {
        label: '顧客',
        templateUrl: 'customers/csv-template/',
        importUrl: 'customers/bulk-import/'
    },
    customer_branches: {
        label: '顧客拠点',
        templateUrl: 'customers/branches/csv-template/',
        importUrl: 'customers/branches/bulk-import/'
    },
    customer_contacts: {
        label: '顧客担当者',
        templateUrl: 'customers/contacts/csv-template/',
        importUrl: 'customers/contacts/bulk-import/'
    },
    suppliers: {
        label: '仕入先',
        templateUrl: 'supplier/suppliers/csv-template/',
        importUrl: 'supplier/suppliers/bulk-import/'
    },
    supplier_branches: {
        label: '仕入先拠点',
        templateUrl: 'supplier/branches/csv-template/',
        importUrl: 'supplier/branches/bulk-import/'
    },
    supplier_contacts: {
        label: '仕入先担当者',
        templateUrl: 'supplier/contacts/csv-template/',
        importUrl: 'supplier/contacts/bulk-import/'
    },
    products: {
        label: '製品',
        templateUrl: 'products/csv-template/',
        importUrl: 'products/bulk-import/'
    },
    parts: {
        label: '部品',
        templateUrl: 'purchases/parts/csv-template/',
        importUrl: 'purchases/parts/bulk-import/'
    },
    price_histories: {
        label: '価格履歴',
        templateUrl: 'purchases/price-histories/csv-template/',
        importUrl: 'purchases/price-histories/bulk-import/'
    }
};

export default function BulkImportPage() {
    const [selectedTab, setSelectedTab] = useState<ImportType>('customers');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            setResult(null);
        }
    };

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
        } catch (error) {
            console.error('Import error:', error);
            setResult({
                success: false,
                message: 'インポート中にエラーが発生しました',
                success_count: 0,
                errors: []
            });
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

    return (
        <AuthGuard>
            <Sidebar>
                <Box sx={{ width: '100%' }}>
                    <Typography variant="h4" gutterBottom>
                        一括登録
                    </Typography>

                    <Paper sx={{ mt: 3 }}>
                <Tabs
                    value={selectedTab}
                    onChange={(_, newValue) => {
                        setSelectedTab(newValue);
                        setFile(null);
                        setResult(null);
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {Object.entries(IMPORT_CONFIGS).map(([key, config]) => (
                        <Tab key={key} label={config.label} value={key} />
                    ))}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                手順
                            </Typography>
                            <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
                                <li>CSVテンプレートをダウンロード</li>
                                <li>テンプレートに登録するデータを入力</li>
                                <li>CSVファイルをアップロード</li>
                                <li>「インポート」ボタンをクリック</li>
                            </Typography>
                        </CardContent>
                    </Card>

                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadTemplate}
                        >
                            CSVテンプレートをダウンロード
                        </Button>

                        <Button
                            variant="contained"
                            component="label"
                            startIcon={<UploadIcon />}
                        >
                            CSVファイルを選択
                            <input
                                type="file"
                                accept=".csv"
                                hidden
                                onChange={handleFileChange}
                            />
                        </Button>

                        {file && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleImport}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={24} /> : 'インポート'}
                            </Button>
                        )}
                    </Box>

                    {file && (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            選択されたファイル: {file.name}
                        </Alert>
                    )}

                    {result && (
                        <Box sx={{ mt: 3 }}>
                            <Alert severity={result.success ? 'success' : 'error'}>
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
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>行番号</TableCell>
                                                <TableCell>エラー内容</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {result.errors.map((error, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{error.row}</TableCell>
                                                    <TableCell>
                                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
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
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>行番号</TableCell>
                                                    <TableCell>詳細</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {result.created_items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{item.row}</TableCell>
                                                        <TableCell>
                                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
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
