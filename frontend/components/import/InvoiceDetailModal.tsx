// components/import/InvoiceDetailModal.tsx
// インボイス詳細・編集モーダル（Enter key navigation対応）

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Grid,
    TextField,
    Tabs,
    Tab,
    Chip,
    IconButton,
    Divider,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Close as CloseIcon,
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
    Description as FileIcon,
} from '@mui/icons-material';
import { ImportInvoice, ImportFile, ImportFileType, ImportFileTypeLabels } from '@/types/import';
import { importApi } from '@/services/apiImport';
import { checkInvoiceCompletion, getCompletionStatusDisplay } from '@/utils/invoiceCompletion';
import toast from 'react-hot-toast';

interface InvoiceDetailModalProps {
    open: boolean;
    onClose: () => void;
    invoiceId: number | null;
    onUpdate?: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
);

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
    open,
    onClose,
    invoiceId,
    onUpdate,
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [invoice, setInvoice] = useState<ImportInvoice | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedFileType, setSelectedFileType] = useState<ImportFileType>('invoice');
    const [filePreviewUrls, setFilePreviewUrls] = useState<Map<number, string>>(new Map());
    const [loadingPreview, setLoadingPreview] = useState<number | null>(null);

    // フォーカス管理用ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // インボイスデータ読み込み
    const loadInvoiceDetail = useCallback(async () => {
        if (!invoiceId) return;

        setLoading(true);
        try {
            const data = await importApi.invoice.getImportInvoice(invoiceId);
            setInvoice(data);
        } catch (error) {
            console.error('Failed to load invoice:', error);
            toast.error('インボイスの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        if (open && invoiceId) {
            loadInvoiceDetail();
        }
    }, [open, invoiceId, loadInvoiceDetail]);

    // Enter key navigation: 入力フィールド間のフォーカス移動
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const target = event.target as HTMLElement;

            // 現在フォーカス中の要素を取得
            const focusableElements = Array.from(
                document.querySelectorAll<HTMLElement>(
                    'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
                )
            );

            const currentIndex = focusableElements.indexOf(target);
            if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
                // 次の要素にフォーカス
                focusableElements[currentIndex + 1].focus();
            }
        }
    };

    // ファイルアップロード
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!invoice || !event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        setUploadingFile(true);

        try {
            await importApi.invoice.uploadFile(invoice.id, selectedFileType, file);
            toast.success('ファイルをアップロードしました');
            await loadInvoiceDetail();
            if (onUpdate) onUpdate();

            // ファイル入力をリセット
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Failed to upload file:', error);
            toast.error('ファイルのアップロードに失敗しました');
        } finally {
            setUploadingFile(false);
        }
    };

    // ファイル削除
    const handleFileDelete = async (fileId: number) => {
        if (!invoice) return;

        const confirmed = window.confirm('このファイルを削除してもよろしいですか？');
        if (!confirmed) return;

        try {
            await importApi.invoice.deleteFile(invoice.id, fileId);
            toast.success('ファイルを削除しました');
            await loadInvoiceDetail();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to delete file:', error);
            toast.error('ファイルの削除に失敗しました');
        }
    };

    // ファイルダウンロード
    const handleFileDownload = async (fileId: number, fileName: string) => {
        if (!invoice) return;

        try {
            const blob = await importApi.invoice.downloadFile(invoice.id, fileId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download file:', error);
            toast.error('ファイルのダウンロードに失敗しました');
        }
    };

    // ファイルをタイプ別に分類
    const getFilesByType = useCallback((fileType: ImportFileType): ImportFile[] => {
        return invoice?.files?.filter((f) => f.file_type === fileType) || [];
    }, [invoice]);

    // ファイルプレビューURLを取得
    const loadFilePreview = useCallback(async (file: ImportFile) => {
        if (!invoice) return;

        // 既にプレビューURLがある場合はスキップ
        if (filePreviewUrls.has(file.id)) return;

        setLoadingPreview(file.id);
        try {
            const blob = await importApi.invoice.downloadFile(invoice.id, file.id);
            const url = window.URL.createObjectURL(blob);
            setFilePreviewUrls((prev) => new Map(prev).set(file.id, url));
        } catch (error) {
            console.error('Failed to load file preview:', error);
            toast.error('ファイルのプレビュー読み込みに失敗しました');
        } finally {
            setLoadingPreview(null);
        }
    }, [invoice, filePreviewUrls]);

    // タブが切り替わったときに、そのタブのファイルをプレビューロード
    useEffect(() => {
        if (!invoice) return;

        const fileTypes: ImportFileType[] = ['invoice', 'waybill', 'bill'];
        // activeTab 0 = 明細, 1 = invoice, 2 = waybill, 3 = bill
        if (activeTab === 0) return; // 明細タブはファイル不要

        const fileTypeIndex = activeTab - 1;
        const fileType = fileTypes[fileTypeIndex];
        const files = getFilesByType(fileType);

        // 最初のファイルをプレビューロード
        if (files.length > 0 && !filePreviewUrls.has(files[0].id)) {
            loadFilePreview(files[0]);
        }
    }, [activeTab, invoice, filePreviewUrls, loadFilePreview]);

    // ファイルプレビュー
    const renderFilePreview = (file: ImportFile) => {
        const fileName = file.file_name || file.file;
        const fileUrl = filePreviewUrls.get(file.id);

        // プレビューURLがまだロードされていない場合
        if (!fileUrl) {
            // ロード開始（まだ開始していない場合）
            if (loadingPreview !== file.id) {
                loadFilePreview(file);
            }

            // ロード中の表示
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (fileName.toLowerCase().endsWith('.pdf')) {
            return (
                <Box sx={{ height: '70vh', width: '100%', overflow: 'auto' }}>
                    <iframe
                        src={fileUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                        }}
                        title="PDF Preview"
                    />
                </Box>
            );
        }

        if (fileName.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
            return (
                <Box sx={{ textAlign: 'center', p: 2 }}>
                    <img
                        src={fileUrl}
                        alt={fileName}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            objectFit: 'contain',
                        }}
                    />
                </Box>
            );
        }

        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                このファイル形式のプレビューには対応していません。ダウンロードしてご確認ください。
            </Alert>
        );
    };

    // 完了状態チェック
    const completionStatus = invoice
        ? checkInvoiceCompletion(invoice, invoice.linked_pos)
        : null;
    const completionDisplay = completionStatus
        ? getCompletionStatusDisplay(completionStatus)
        : null;

    // モーダルを閉じる
    const handleClose = () => {
        // Blob URLをクリーンアップ
        filePreviewUrls.forEach((url) => {
            window.URL.revokeObjectURL(url);
        });
        setFilePreviewUrls(new Map());
        setActiveTab(0);
        setInvoice(null);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: { height: '90vh' },
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6" component="span">
                            インボイス詳細
                        </Typography>
                        {invoice && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {invoice.invoice_number}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {completionDisplay && (
                            <Chip
                                label={completionDisplay.label}
                                color={completionDisplay.color}
                                variant={completionDisplay.variant}
                                icon={completionDisplay.variant === 'filled' ? <CheckIcon /> : <WarningIcon />}
                            />
                        )}
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>

            <Divider />

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : invoice ? (
                    <Grid container spacing={3}>
                        {/* 左側: 基本情報 */}
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        基本情報
                                    </Typography>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                インボイス番号
                                            </Typography>
                                            <Typography variant="body1" fontWeight="medium">
                                                {invoice.invoice_number}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                サプライヤー
                                            </Typography>
                                            <Typography variant="body1">
                                                {invoice.supplier_name}
                                            </Typography>
                                            {invoice.supplier_branch_name && (
                                                <Typography variant="caption" display="block">
                                                    {invoice.supplier_branch_name}
                                                </Typography>
                                            )}
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                インボイス日
                                            </Typography>
                                            <Typography variant="body1">
                                                {invoice.invoice_date}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                受領日
                                            </Typography>
                                            <Typography variant="body1">
                                                {invoice.received_date || '-'}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                金額
                                            </Typography>
                                            <Typography variant="body1" fontWeight="medium">
                                                {invoice.currency} {(invoice.total_amount || 0).toLocaleString()}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                紐付けPO
                                            </Typography>
                                            <Typography variant="body1">
                                                {invoice.linked_po_count || 0}件
                                            </Typography>
                                        </Box>

                                        <Divider />

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" gutterBottom>
                                                完了状態チェック
                                            </Typography>
                                            {completionStatus && (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {completionStatus.hasPOConsistency ? (
                                                            <CheckIcon color="success" fontSize="small" />
                                                        ) : (
                                                            <WarningIcon color="warning" fontSize="small" />
                                                        )}
                                                        <Typography variant="body2">
                                                            PO整合性
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {completionStatus.hasWaybill ? (
                                                            <CheckIcon color="success" fontSize="small" />
                                                        ) : (
                                                            <WarningIcon color="warning" fontSize="small" />
                                                        )}
                                                        <Typography variant="body2">
                                                            Waybill登録
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {completionStatus.hasBillFile ? (
                                                            <CheckIcon color="success" fontSize="small" />
                                                        ) : (
                                                            <WarningIcon color="warning" fontSize="small" />
                                                        )}
                                                        <Typography variant="body2">
                                                            請求書登録
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 右側: ファイル管理（タブ） */}
                        <Grid item xs={12} md={8}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        ファイル管理
                                    </Typography>

                                    <Tabs
                                        value={activeTab}
                                        onChange={(_, newValue) => setActiveTab(newValue)}
                                        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                                        variant="scrollable"
                                        scrollButtons="auto"
                                    >
                                        <Tab
                                            label={`明細情報 (${invoice?.items?.length || 0}件)`}
                                            icon={<FileIcon />}
                                            iconPosition="start"
                                        />
                                        <Tab
                                            label={`Invoice (${getFilesByType('invoice').length})`}
                                            icon={<FileIcon />}
                                            iconPosition="start"
                                        />
                                        <Tab
                                            label={`Waybill (${getFilesByType('waybill').length})`}
                                            icon={<FileIcon />}
                                            iconPosition="start"
                                        />
                                        <Tab
                                            label={`請求書 (${getFilesByType('bill').length})`}
                                            icon={<FileIcon />}
                                            iconPosition="start"
                                        />
                                    </Tabs>

                                    {/* 明細情報タブ */}
                                    <TabPanel value={activeTab} index={0}>
                                        <Box sx={{ height: '100%', overflow: 'auto' }}>
                                            {invoice?.items && invoice.items.length > 0 ? (
                                                <>
                                                    <TableContainer>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>品番</TableCell>
                                                                    <TableCell>品名・説明</TableCell>
                                                                    <TableCell align="right">数量</TableCell>
                                                                    <TableCell align="right">単価</TableCell>
                                                                    <TableCell>単位</TableCell>
                                                                    <TableCell align="right">金額</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {invoice.items.map((item) => (
                                                                    <TableRow key={item.id}>
                                                                        <TableCell>
                                                                            <Typography variant="body2" fontWeight="medium">
                                                                                {item.part_number}
                                                                            </Typography>
                                                                            {item.material_code && (
                                                                                <Typography variant="caption" color="text.secondary" display="block">
                                                                                    マスター: {item.material_code}
                                                                                </Typography>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="body2">
                                                                                {item.description}
                                                                            </Typography>
                                                                            {item.material_name && (
                                                                                <Typography variant="caption" color="text.secondary" display="block">
                                                                                    {item.material_name}
                                                                                </Typography>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {item.quantity.toLocaleString()}
                                                                        </TableCell>
                                                                        <TableCell align="right">
                                                                            {item.unit_price
                                                                                ? `${invoice.currency || ''} ${item.unit_price.toLocaleString()}`
                                                                                : '-'}
                                                                        </TableCell>
                                                                        <TableCell>{item.unit}</TableCell>
                                                                        <TableCell align="right">
                                                                            {item.amount
                                                                                ? `${invoice.currency || ''} ${item.amount.toLocaleString()}`
                                                                                : '-'}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            合計品目数: {invoice.items.length}件
                                                        </Typography>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            合計金額: {invoice.currency || ''}{' '}
                                                            {(invoice.total_amount || 0).toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                </>
                                            ) : (
                                                <Alert severity="info">
                                                    明細情報が登録されていません
                                                </Alert>
                                            )}
                                        </Box>
                                    </TabPanel>

                                    {/* Invoiceタブ */}
                                    <TabPanel value={activeTab} index={1}>
                                        <Box onKeyDown={handleKeyDown}>
                                            <Box sx={{ mb: 2 }}>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileUpload}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<UploadIcon />}
                                                    onClick={() => {
                                                        setSelectedFileType('invoice');
                                                        fileInputRef.current?.click();
                                                    }}
                                                    disabled={uploadingFile}
                                                >
                                                    Invoiceアップロード
                                                </Button>
                                            </Box>

                                            {getFilesByType('invoice').length > 0 ? (
                                                <>
                                                    <List dense>
                                                        {getFilesByType('invoice').map((file) => (
                                                            <ListItem key={file.id}>
                                                                <ListItemText
                                                                    primary={file.file_name}
                                                                    secondary={`${((file.file_size || 0) / 1024).toFixed(2)} KB`}
                                                                />
                                                                <ListItemSecondaryAction>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                            handleFileDownload(
                                                                                file.id,
                                                                                file.file_name
                                                                            )
                                                                        }
                                                                    >
                                                                        <DownloadIcon />
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleFileDelete(file.id)}
                                                                    >
                                                                        <DeleteIcon />
                                                                    </IconButton>
                                                                </ListItemSecondaryAction>
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                    <Divider sx={{ my: 2 }} />
                                                    {renderFilePreview(getFilesByType('invoice')[0])}
                                                </>
                                            ) : (
                                                <Alert severity="info">
                                                    Invoiceファイルが登録されていません
                                                </Alert>
                                            )}
                                        </Box>
                                    </TabPanel>

                                    {/* Waybillタブ */}
                                    <TabPanel value={activeTab} index={2}>
                                        <Box onKeyDown={handleKeyDown}>
                                            <Box sx={{ mb: 2 }}>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileUpload}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<UploadIcon />}
                                                    onClick={() => {
                                                        setSelectedFileType('waybill');
                                                        fileInputRef.current?.click();
                                                    }}
                                                    disabled={uploadingFile}
                                                >
                                                    Waybillアップロード
                                                </Button>
                                            </Box>

                                            {getFilesByType('waybill').length > 0 ? (
                                                <>
                                                    <List dense>
                                                        {getFilesByType('waybill').map((file) => (
                                                            <ListItem key={file.id}>
                                                                <ListItemText
                                                                    primary={file.original_filename || file.file_name}
                                                                    secondary={`${(file.file_size || 0) / 1024} KB`}
                                                                />
                                                                <ListItemSecondaryAction>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                            handleFileDownload(
                                                                                file.id,
                                                                                file.original_filename || file.file_name
                                                                            )
                                                                        }
                                                                    >
                                                                        <DownloadIcon />
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleFileDelete(file.id)}
                                                                    >
                                                                        <DeleteIcon />
                                                                    </IconButton>
                                                                </ListItemSecondaryAction>
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                    <Divider sx={{ my: 2 }} />
                                                    {renderFilePreview(getFilesByType('waybill')[0])}
                                                </>
                                            ) : (
                                                <Alert severity="info">
                                                    Waybillファイルが登録されていません
                                                </Alert>
                                            )}
                                        </Box>
                                    </TabPanel>

                                    {/* 請求書タブ */}
                                    <TabPanel value={activeTab} index={3}>
                                        <Box onKeyDown={handleKeyDown}>
                                            <Box sx={{ mb: 2 }}>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileUpload}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<UploadIcon />}
                                                    onClick={() => {
                                                        setSelectedFileType('bill');
                                                        fileInputRef.current?.click();
                                                    }}
                                                    disabled={uploadingFile}
                                                >
                                                    請求書アップロード
                                                </Button>
                                            </Box>

                                            {getFilesByType('bill').length > 0 ? (
                                                <>
                                                    <List dense>
                                                        {getFilesByType('bill').map((file) => (
                                                            <ListItem key={file.id}>
                                                                <ListItemText
                                                                    primary={file.original_filename || file.file_name}
                                                                    secondary={`${(file.file_size || 0) / 1024} KB`}
                                                                />
                                                                <ListItemSecondaryAction>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                            handleFileDownload(
                                                                                file.id,
                                                                                file.original_filename || file.file_name
                                                                            )
                                                                        }
                                                                    >
                                                                        <DownloadIcon />
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleFileDelete(file.id)}
                                                                    >
                                                                        <DeleteIcon />
                                                                    </IconButton>
                                                                </ListItemSecondaryAction>
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                    <Divider sx={{ my: 2 }} />
                                                    {renderFilePreview(getFilesByType('bill')[0])}
                                                </>
                                            ) : (
                                                <Alert severity="info">
                                                    請求書ファイルが登録されていません
                                                </Alert>
                                            )}
                                        </Box>
                                    </TabPanel>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : (
                    <Alert severity="error">インボイスが見つかりません</Alert>
                )}
            </DialogContent>

            <Divider />

            <DialogActions>
                <Button onClick={handleClose}>閉じる</Button>
            </DialogActions>
        </Dialog>
    );
};
