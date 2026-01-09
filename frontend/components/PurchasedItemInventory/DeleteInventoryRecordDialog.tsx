'use client';

import React from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
} from '@mui/material';

interface DeleteInventoryRecordDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isDeleting: boolean;
}

export default function DeleteInventoryRecordDialog({
    open,
    onClose,
    onConfirm,
    isDeleting,
}: DeleteInventoryRecordDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>在庫レコード削除確認</DialogTitle>
            <DialogContent>
                <Alert severity="warning" sx={{ mt: 1 }}>
                    この在庫レコードを削除しますか？<br />
                    削除すると元に戻すことはできません。
                </Alert>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    キャンセル
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={isDeleting}
                >
                    {isDeleting ? <CircularProgress size={20} /> : '削除'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
