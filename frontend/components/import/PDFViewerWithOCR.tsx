// components/import/PDFViewerWithOCR.tsx
// 既存のPDF表示機能を流用したOCR統合コンポーネント

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    CircularProgress,
    Alert,
    LinearProgress,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Scanner as ScannerIcon,
} from '@mui/icons-material';
import { processOCR, preprocessImage } from '@/utils/ocrProcessor';
import { OCRExtractionResult, OCRExtractedItem } from '@/types/import';
import toast from 'react-hot-toast';

interface PDFViewerWithOCRProps {
    file: File | null;
    fileUrl?: string;
    onOCRComplete?: (result: OCRExtractionResult) => void;
    onOCRItemsExtracted?: (items: OCRExtractedItem[]) => void;
    showOCRButton?: boolean;
    autoStartOCR?: boolean;
    height?: string | number;
}

export const PDFViewerWithOCR: React.FC<PDFViewerWithOCRProps> = ({
    file,
    fileUrl: externalFileUrl,
    onOCRComplete,
    onOCRItemsExtracted,
    showOCRButton = true,
    autoStartOCR = false,
    height = '100%',
}) => {
    const [loading, setLoading] = useState(false);
    const [fileUrl, setFileUrl] = useState<string | null>(externalFileUrl || null);
    const [error, setError] = useState<string | null>(null);
    const [ocrProcessing, setOcrProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrResult, setOcrResult] = useState<OCRExtractionResult | null>(null);
    const [zoom, setZoom] = useState(100);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // ファイル拡張子を取得
    const getFileExtension = (filename: string): string => {
        return filename.split('.').pop()?.toLowerCase() || '';
    };

    const fileName = file?.name || '';
    const extension = getFileExtension(fileName);
    const isPdf = extension === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);

    // ファイルURLの生成
    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setFileUrl(url);
            setError(null);

            return () => {
                URL.revokeObjectURL(url);
            };
        } else if (externalFileUrl) {
            setFileUrl(externalFileUrl);
        } else {
            setFileUrl(null);
        }
    }, [file, externalFileUrl]);

    // 自動OCR開始
    useEffect(() => {
        if (autoStartOCR && file && !ocrResult) {
            handleOCRStart();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStartOCR, file]);

    // OCR処理開始
    const handleOCRStart = useCallback(async () => {
        if (!file) {
            toast.error('ファイルが選択されていません');
            return;
        }

        setOcrProcessing(true);
        setOcrProgress(0);
        setOcrResult(null);

        try {
            let sourceForOCR: File | Blob = file;

            // 画像ファイルの場合は前処理
            if (isImage) {
                setOcrProgress(10);
                toast.loading('画像を最適化しています...', { id: 'ocr-preprocess' });
                sourceForOCR = await preprocessImage(file);
                toast.dismiss('ocr-preprocess');
            }

            setOcrProgress(30);
            toast.loading('OCR処理中...', { id: 'ocr-processing' });

            const result = await processOCR(sourceForOCR, (progress) => {
                setOcrProgress(30 + progress * 60);
            });

            setOcrProgress(100);
            setOcrResult(result);

            if (result.success) {
                toast.success(`${result.items.length}件の品目を抽出しました`, { id: 'ocr-processing' });
                onOCRComplete?.(result);
                onOCRItemsExtracted?.(result.items);
            } else {
                toast.error(result.errors?.[0] || 'OCR処理に失敗しました', { id: 'ocr-processing' });
            }
        } catch (err) {
            console.error('[OCR Error]', err);
            toast.error('OCR処理中にエラーが発生しました', { id: 'ocr-processing' });
            setError('OCR処理中にエラーが発生しました');
        } finally {
            setOcrProcessing(false);
        }
    }, [file, isImage, onOCRComplete, onOCRItemsExtracted]);

    // ダウンロード処理
    const handleDownload = useCallback(() => {
        if (!fileUrl || !file) {
            toast.error('ファイルが読み込まれていません');
            return;
        }

        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('ダウンロードを開始しました');
    }, [fileUrl, file]);

    // ズーム操作
    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 200));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 50));
    const handleZoomReset = () => setZoom(100);

    // レンダリング
    const renderContent = () => {
        if (loading) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    <CircularProgress />
                    <Typography>ファイルを読み込んでいます...</Typography>
                </Box>
            );
        }

        if (error) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        p: 3,
                    }}
                >
                    <Alert severity="error">{error}</Alert>
                </Box>
            );
        }

        if (!fileUrl) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        p: 3,
                    }}
                >
                    <Alert severity="info">
                        ファイルを選択してください
                    </Alert>
                </Box>
            );
        }

        if (isPdf) {
            return (
                <iframe
                    ref={iframeRef}
                    src={fileUrl}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left',
                    }}
                    title="PDF プレビュー"
                />
            );
        }

        if (isImage) {
            return (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        overflow: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        p: 2,
                    }}
                >
                    <img
                        src={fileUrl}
                        alt="プレビュー"
                        style={{
                            maxWidth: `${zoom}%`,
                            height: 'auto',
                            objectFit: 'contain',
                        }}
                    />
                </Box>
            );
        }

        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    p: 3,
                }}
            >
                <Alert severity="warning" sx={{ maxWidth: 400 }}>
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
                            size="small"
                        >
                            ダウンロード
                        </Button>
                    </Box>
                </Alert>
            </Box>
        );
    };

    return (
        <Paper
            sx={{
                height,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* ツールバー */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {fileName || 'ファイル未選択'}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* ズームコントロール */}
                    <Tooltip title="縮小">
                        <span>
                            <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 50}>
                                <ZoomOutIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'center' }}>
                        {zoom}%
                    </Typography>
                    <Tooltip title="拡大">
                        <span>
                            <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 200}>
                                <ZoomInIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="リセット">
                        <span>
                            <IconButton size="small" onClick={handleZoomReset}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* ダウンロード */}
                    <Tooltip title="ダウンロード">
                        <span>
                            <IconButton size="small" onClick={handleDownload} disabled={!fileUrl}>
                                <DownloadIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* OCRボタン */}
                    {showOCRButton && (isPdf || isImage) && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={ocrProcessing ? <CircularProgress size={16} color="inherit" /> : <ScannerIcon />}
                            onClick={handleOCRStart}
                            disabled={!file || ocrProcessing}
                            sx={{ ml: 1 }}
                        >
                            {ocrProcessing ? 'OCR処理中...' : 'OCR読取'}
                        </Button>
                    )}
                </Box>
            </Box>

            {/* OCR進捗バー */}
            {ocrProcessing && (
                <LinearProgress
                    variant="determinate"
                    value={ocrProgress}
                    sx={{ height: 4 }}
                />
            )}

            {/* コンテンツエリア */}
            <Box
                sx={{
                    flex: 1,
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {renderContent()}
            </Box>

            {/* OCR結果サマリー */}
            {ocrResult && (
                <Box
                    sx={{
                        px: 2,
                        py: 1,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: ocrResult.success ? 'success.50' : 'error.50',
                    }}
                >
                    <Typography variant="body2">
                        {ocrResult.success
                            ? `OCR完了: ${ocrResult.items.length}件の品目を抽出 (${ocrResult.processing_time_ms}ms)`
                            : `OCRエラー: ${ocrResult.errors?.[0] || '不明なエラー'}`}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

export default PDFViewerWithOCR;
