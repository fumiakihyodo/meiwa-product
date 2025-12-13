// components/QuoteFileViewerModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    IconButton,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { purchasesApi } from '@/services/apiPurchases';
import toast from 'react-hot-toast';

interface QuoteFileViewerModalProps {
    open: boolean;
    onClose: () => void;
    priceHistoryId: number;
    fileName: string;
}

export const QuoteFileViewerModal: React.FC<QuoteFileViewerModalProps> = ({
    open,
    onClose,
    priceHistoryId,
    fileName,
}) => {
    const [loading, setLoading] = useState(true);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ファイル拡張子を取得
    const getFileExtension = (filename: string): string => {
        return filename.split('.').pop()?.toLowerCase() || '';
    };

    const extension = getFileExtension(fileName);
    const isPdf = extension === 'pdf';

    useEffect(() => {
        if (open) {
            loadFile();
        }
        
        return () => {
            // クリーンアップ
            if (fileUrl) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [open, priceHistoryId]);

    const loadFile = async () => {
        console.log('[QuoteFileViewerModal] Loading file:', { priceHistoryId, fileName });
        setLoading(true);
        setError(null);
        
        try {
            const blob = await purchasesApi.downloadQuoteFile(priceHistoryId);
            console.log('[QuoteFileViewerModal] File loaded, blob size:', blob.size);
            
            const url = URL.createObjectURL(blob);
            console.log('[QuoteFileViewerModal] Object URL created:', url);
            
            setFileUrl(url);
        } catch (err) {
            console.error('[QuoteFileViewerModal] Failed to load file:', err);
            setError('ファイルの読み込みに失敗しました');
            toast.error('ファイルの読み込みに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        console.log('[QuoteFileViewerModal] Download clicked');
        
        if (!fileUrl) {
            toast.error('ファイルが読み込まれていません');
            return;
        }

        try {
            // Blobを再取得してダウンロード
            const blob = await purchasesApi.downloadQuoteFile(priceHistoryId);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('[QuoteFileViewerModal] Download started');
            toast.success('ダウンロードを開始しました');
        } catch (err) {
            console.error('[QuoteFileViewerModal] Download failed:', err);
            toast.error('ダウンロードに失敗しました');
        }
    };

    const handleClose = () => {
        console.log('[QuoteFileViewerModal] Closing modal');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { height: '90vh' }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h6">見積書プレビュー</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {fileName}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownload}
                            disabled={!fileUrl || loading}
                            size="small"
                        >
                            ダウンロード
                        </Button>
                        <IconButton onClick={handleClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>ファイルを読み込んでいます...</Typography>
                    </Box>
                ) : error ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, p: 3 }}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                ) : !isPdf ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, p: 3 }}>
                        <Alert severity="info" sx={{ maxWidth: 600 }}>
                            <Typography variant="body1" gutterBottom fontWeight="medium">
                                このファイル形式（.{extension}）はプレビューできません
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                ダウンロードボタンからファイルをダウンロードしてご確認ください
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<DownloadIcon />}
                                    onClick={handleDownload}
                                >
                                    ダウンロード
                                </Button>
                            </Box>
                        </Alert>
                    </Box>
                ) : fileUrl ? (
                    <iframe
                        src={fileUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                        }}
                        title="見積書プレビュー"
                    />
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                        <Alert severity="warning">ファイルの表示準備ができていません</Alert>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose}>閉じる</Button>
            </DialogActions>
        </Dialog>
    );
};