'use client';

import React from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { PurchasedItemInventory } from '@/types/purchases';

interface InventoryHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    inventory: PurchasedItemInventory | null;
}

export default function InventoryHistoryDialog({
    open,
    onClose,
    inventory,
}: InventoryHistoryDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                入出庫・調整履歴
                {inventory && (
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                        {inventory.part_number} - {inventory.part_name}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {inventory && (
                    <Box sx={{ mt: 1 }}>
                        {/* 在庫情報サマリー */}
                        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">製品</Typography>
                                    <Typography>{inventory.product_number || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">仕入先</Typography>
                                    <Typography>{inventory.supplier_name || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">現在の在庫数量</Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        {inventory.quantity} {inventory.unit || ''}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>

                        {/* 履歴表示 */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>履歴</Typography>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                            {inventory.notes ? (
                                <Box>
                                    {inventory.notes.split('\n').map((line, index) => {
                                        const isAdjustment = line.includes('[在庫調整]');
                                        return (
                                            <Box
                                                key={index}
                                                sx={{
                                                    p: 1,
                                                    mb: 1,
                                                    borderLeft: isAdjustment ? '3px solid' : 'none',
                                                    borderColor: line.includes('+') ? 'success.main' : 'error.main',
                                                    bgcolor: isAdjustment ? 'action.hover' : 'transparent',
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        whiteSpace: 'pre-wrap',
                                                    }}
                                                >
                                                    {line}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    履歴はありません
                                </Typography>
                            )}
                        </Paper>

                        {/* 追加情報 */}
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                ※ 在庫調整を行うと、自動的に履歴が記録されます。
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    閉じる
                </Button>
            </DialogActions>
        </Dialog>
    );
}
