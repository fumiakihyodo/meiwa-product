'use client';

import React from 'react';
import {
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { PurchaseOrder } from '@/types/purchases';

interface DeleteOrderConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    order: PurchaseOrder | null;
    onConfirm: () => Promise<void>;
}

export default function DeleteOrderConfirmDialog({
    open,
    onClose,
    order,
    onConfirm,
}: DeleteOrderConfirmDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>発注の削除</DialogTitle>
            <DialogContent>
                <Typography>
                    発注「{order?.order_number}」を削除してもよろしいですか？
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    キャンセル
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                >
                    削除
                </Button>
            </DialogActions>
        </Dialog>
    );
}
