'use client';

import React from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { PartWithInventory } from '@/types/purchases';

interface PartDetailDialogProps {
    open: boolean;
    onClose: () => void;
    part: PartWithInventory | null;
    onDeleteRecord: (recordId: number) => void;
}

export default function PartDetailDialog({
    open,
    onClose,
    part,
    onDeleteRecord,
}: PartDetailDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                部品詳細・在庫履歴
                {part && (
                    <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                        {part.part_number} - {part.part_name}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent>
                {part && (
                    <Box sx={{ mt: 1 }}>
                        {/* 部品情報サマリー */}
                        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">製品</Typography>
                                    <Typography>{part.product_number || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">仕入先</Typography>
                                    <Typography>
                                        {part.supplier_branch_name
                                            ? `${part.supplier_name} (${part.supplier_branch_name})`
                                            : part.supplier_name || '-'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">仕入れ先部品名称</Typography>
                                    <Typography>{part.supplier_part_name || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">現在の在庫数量</Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        {part.total_quantity} {part.unit || ''}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>

                        {/* 在庫レコード一覧 */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>在庫レコード履歴</Typography>
                        {part.inventory_records && part.inventory_records.length > 0 ? (
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell>入庫日</TableCell>
                                            <TableCell align="right">数量</TableCell>
                                            <TableCell>ロット番号</TableCell>
                                            <TableCell>発注番号</TableCell>
                                            <TableCell>備考</TableCell>
                                            <TableCell>登録者</TableCell>
                                            <TableCell align="center">操作</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {part.inventory_records.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell>{record.received_date || '-'}</TableCell>
                                                <TableCell align="right">
                                                    <Chip
                                                        size="small"
                                                        label={`${record.quantity} ${part.unit || ''}`}
                                                        color={record.quantity > 0 ? 'primary' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>{record.lot_number || '-'}</TableCell>
                                                <TableCell>{record.order_number || '-'}</TableCell>
                                                <TableCell>
                                                    {record.notes ? (
                                                        <Tooltip title={record.notes}>
                                                            <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {record.notes}
                                                            </Typography>
                                                        </Tooltip>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>{record.created_by_name || '-'}</TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="削除">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => onDeleteRecord(record.id)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Alert severity="info">
                                在庫レコードはありません。
                            </Alert>
                        )}
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
