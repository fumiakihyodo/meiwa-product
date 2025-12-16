// components/SuppliedItemModal/SuppliedItemPriceListModal.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import {
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { SuppliedItem, SuppliedItemPriceHistory } from '@/types/purchases';
import { SectionCard } from '@/components/common/display/SectionCard';

interface SuppliedItemPriceListModalProps {
    open: boolean;
    onClose: () => void;
    suppliedItem: SuppliedItem | null;
    onSwitchToDetail?: (suppliedItem: SuppliedItem) => void;
}

export const SuppliedItemPriceListModal: React.FC<SuppliedItemPriceListModalProps> = ({
    open,
    onClose,
    suppliedItem,
    onSwitchToDetail,
}) => {
    const [newPriceModalOpen, setNewPriceModalOpen] = useState(false);

    const handleBack = useCallback(() => {
        if (suppliedItem && onSwitchToDetail) {
            onSwitchToDetail(suppliedItem);
        }
    }, [suppliedItem, onSwitchToDetail]);

    const columns: GridColDef[] = [
        {
            field: 'price',
            headerName: '単価',
            width: 120,
            valueFormatter: (params) => `¥${Number(params).toLocaleString()}`,
        },
        {
            field: 'start_date',
            headerName: '開始日',
            width: 120,
        },
        {
            field: 'end_date',
            headerName: '終了日',
            width: 120,
            valueFormatter: (params) => params || '無期限',
        },
        {
            field: 'is_current',
            headerName: 'ステータス',
            width: 100,
            renderCell: (params: GridRenderCellParams) => {
                if (params.row.is_current) {
                    return <Chip label="適用中" color="success" size="small" />;
                } else if (params.row.is_future) {
                    return <Chip label="将来" color="info" size="small" />;
                } else if (params.row.is_expired) {
                    return <Chip label="期限切れ" color="default" size="small" />;
                }
                return <Chip label="無効" color="default" size="small" />;
            },
        },
        {
            field: 'change_reason',
            headerName: '変更理由',
            width: 200,
        },
        {
            field: 'quote_file_name',
            headerName: '見積書',
            width: 150,
            renderCell: (params: GridRenderCellParams) => {
                if (params.value) {
                    return (
                        <Typography
                            variant="body2"
                            sx={{ cursor: 'pointer', color: 'primary.main' }}
                        >
                            {params.value}
                        </Typography>
                    );
                }
                return '-';
            },
        },
        {
            field: 'created_at',
            headerName: '作成日時',
            width: 150,
            valueFormatter: (params) => new Date(params as string).toLocaleString('ja-JP'),
        },
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                支給品価格履歴
                {suppliedItem && (
                    <Typography variant="body2" color="text.secondary">
                        {suppliedItem.item_number} - {suppliedItem.item_name}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent dividers>
                {suppliedItem ? (
                    <Box>
                        {/* 現在の価格情報 */}
                        <SectionCard title="現在の価格情報">
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Typography variant="h6">
                                    {suppliedItem.current_price
                                        ? `¥${suppliedItem.current_price.toLocaleString()}`
                                        : '未設定'}
                                </Typography>
                                <Chip
                                    label={`価格履歴: ${suppliedItem.price_history_count || 0}件`}
                                    size="small"
                                />
                            </Box>
                        </SectionCard>

                        {/* 価格履歴一覧 */}
                        <Box sx={{ mt: 3, height: 400 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">価格履歴一覧</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setNewPriceModalOpen(true)}
                                >
                                    価格追加
                                </Button>
                            </Box>
                            <DataGrid
                                rows={suppliedItem.supplied_item_price_histories || []}
                                columns={columns}
                                pageSizeOptions={[10, 25, 50]}
                                initialState={{
                                    pagination: { paginationModel: { pageSize: 10 } },
                                }}
                                disableRowSelectionOnClick
                            />
                        </Box>
                    </Box>
                ) : (
                    <Typography>支給品情報が見つかりません</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
                    詳細に戻る
                </Button>
                <Button onClick={onClose} startIcon={<CloseIcon />}>
                    閉じる
                </Button>
            </DialogActions>
        </Dialog>
    );
};
