// components/import/InvoiceTable.tsx
// インボイス一覧テーブル（行クリック対応、完了状態表示）

'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    IconButton,
    Box,
    Tooltip,
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Cancel as CancelIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { ImportInvoice, ImportPO } from '@/types/import';
import { checkInvoiceCompletion, getCompletionStatusDisplay, getCompletionRowStyle } from '@/utils/invoiceCompletion';

interface InvoiceTableProps {
    invoices: ImportInvoice[];
    linkedPOsMap?: Map<number, ImportPO[]>;
    onRowClick: (invoice: ImportInvoice) => void;
    onMenuClick?: (event: React.MouseEvent<HTMLElement>, invoice: ImportInvoice) => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
    invoices,
    linkedPOsMap,
    onRowClick,
    onMenuClick,
}) => {
    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>インボイス番号</TableCell>
                        <TableCell>サプライヤー</TableCell>
                        <TableCell>インボイス日</TableCell>
                        <TableCell>受領日</TableCell>
                        <TableCell align="right">金額</TableCell>
                        <TableCell align="center">紐付けPO</TableCell>
                        <TableCell align="center">Waybill</TableCell>
                        <TableCell align="center">請求書</TableCell>
                        <TableCell>完了状態</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invoices.map((invoice) => {
                        // 完了状態チェック
                        const linkedPOs = linkedPOsMap?.get(invoice.id);
                        const completionStatus = checkInvoiceCompletion(invoice, linkedPOs);
                        const completionDisplay = getCompletionStatusDisplay(completionStatus);
                        const rowStyle = getCompletionRowStyle(completionStatus);

                        return (
                            <TableRow
                                key={invoice.id}
                                hover
                                sx={{
                                    cursor: 'pointer',
                                    ...rowStyle,
                                }}
                                onClick={() => onRowClick(invoice)}
                            >
                                <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                        {invoice.invoice_number}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {invoice.supplier_name}
                                    {invoice.supplier_branch_name && (
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {invoice.supplier_branch_name}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>{invoice.invoice_date}</TableCell>
                                <TableCell>{invoice.received_date || '-'}</TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight="medium">
                                        {invoice.currency} {(invoice.total_amount || 0).toLocaleString()}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    {invoice.linked_po_count && invoice.linked_po_count > 0 ? (
                                        <Chip
                                            label={`${invoice.linked_po_count}件`}
                                            size="small"
                                            color={completionStatus.hasPOConsistency ? 'success' : 'warning'}
                                            variant="outlined"
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            -
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title={invoice.has_waybill ? 'Waybill登録済み' : 'Waybill未登録'}>
                                        {invoice.has_waybill ? (
                                            <CheckIcon color="success" fontSize="small" />
                                        ) : (
                                            <CancelIcon color="disabled" fontSize="small" />
                                        )}
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title={invoice.has_bill_file ? '請求書登録済み' : '請求書未登録'}>
                                        {invoice.has_bill_file ? (
                                            <CheckIcon color="success" fontSize="small" />
                                        ) : (
                                            <CancelIcon color="disabled" fontSize="small" />
                                        )}
                                    </Tooltip>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={completionDisplay.label}
                                        size="small"
                                        color={completionDisplay.color}
                                        variant={completionDisplay.variant}
                                    />
                                </TableCell>
                                <TableCell>
                                    {onMenuClick && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onMenuClick(e, invoice);
                                            }}
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
