'use client';

import React from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Send as SendIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Product } from '@/types/product';
import { SupplierPartsGroup, PartForOrder } from '@/types/purchases';

interface CreateOrderDialogProps {
    open: boolean;
    onClose: () => void;
    products: Product[];
    selectedProductForOrder: number | '';
    setSelectedProductForOrder: (value: number | '') => void;
    selectedSupplier: number | '';
    setSelectedSupplier: (value: number | '') => void;
    supplierPartsGroups: SupplierPartsGroup[];
    orderQuantities: Record<number, number>;
    setOrderQuantities: React.Dispatch<React.SetStateAction<Record<number, number>>>;
    orderError: string | null;
    loadingParts: boolean;
    creatingOrder: boolean;
    orderDate: string;
    setOrderDate: (value: string) => void;
    requestedDeliveryDate: string;
    setRequestedDeliveryDate: (value: string) => void;
    onCreateOrders: () => Promise<void>;
    onQuantityConfirm: (part: PartForOrder) => void;
    onQuantityKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, part: PartForOrder) => void;
    calculateDeliveryDate: (leadTimeDays: number | undefined) => string;
    getDefaultProductId: () => number | null;
    onToggleDefaultProduct: (productId: number, e: React.MouseEvent) => void;
}

export default function CreateOrderDialog({
    open,
    onClose,
    products,
    selectedProductForOrder,
    setSelectedProductForOrder,
    selectedSupplier,
    setSelectedSupplier,
    supplierPartsGroups,
    orderQuantities,
    setOrderQuantities,
    orderError,
    loadingParts,
    creatingOrder,
    orderDate,
    setOrderDate,
    requestedDeliveryDate,
    setRequestedDeliveryDate,
    onCreateOrders,
    onQuantityConfirm,
    onQuantityKeyDown,
    calculateDeliveryDate,
    getDefaultProductId,
    onToggleDefaultProduct,
}: CreateOrderDialogProps) {
    // 選択されたサプライヤーの部品グループ
    const selectedSupplierGroup = selectedSupplier
        ? supplierPartsGroups.find(
              (group: SupplierPartsGroup) => group.supplier_branch_id === selectedSupplier
          ) || null
        : null;

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>発注作成</DialogTitle>
            <DialogContent>
                {orderError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {orderError}
                    </Alert>
                )}

                {/* 製品選択 */}
                <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                        <InputLabel>製品を選択 *</InputLabel>
                        <Select
                            value={selectedProductForOrder}
                            label="製品を選択 *"
                            onChange={(e: SelectChangeEvent<number | ''>) => {
                                setSelectedProductForOrder(e.target.value as number);
                                setSelectedSupplier('');
                                setOrderQuantities({});
                            }}
                            renderValue={(selected) => {
                                if (!selected) return '';
                                const product = products.find(p => p.id === selected);
                                if (!product) return '';
                                const isDefault = getDefaultProductId() === product.id;
                                return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {isDefault && <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                                        {product.product_number} - {product.product_name}
                                    </Box>
                                );
                            }}
                        >
                            {products.map((p: Product) => {
                                const isDefault = getDefaultProductId() === p.id;
                                return (
                                    <MenuItem key={p.id} value={p.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                            <Tooltip title={isDefault ? 'デフォルト解除' : 'デフォルトに設定'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => onToggleDefaultProduct(p.id, e)}
                                                    sx={{ p: 0.5 }}
                                                >
                                                    {isDefault ? (
                                                        <StarIcon sx={{ color: 'warning.main' }} />
                                                    ) : (
                                                        <StarBorderIcon sx={{ color: 'action.disabled' }} />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                            <span>{p.product_number} - {p.product_name}</span>
                                        </Box>
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        ★をクリックするとデフォルト製品に設定できます
                    </Typography>
                </Box>

                {/* 仕入先選択（必須） */}
                {supplierPartsGroups.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth size="small" required>
                            <InputLabel>仕入先を選択 *</InputLabel>
                            <Select
                                value={selectedSupplier}
                                label="仕入先を選択 *"
                                onChange={(e: SelectChangeEvent<number | ''>) => {
                                    setSelectedSupplier(e.target.value as number);
                                    setOrderQuantities({});
                                }}
                            >
                                <MenuItem value="" disabled>
                                    -- 仕入先を選択してください --
                                </MenuItem>
                                {supplierPartsGroups.map((group: SupplierPartsGroup) => (
                                    <MenuItem key={group.supplier_branch_id} value={group.supplier_branch_id}>
                                        {group.supplier_name} ({group.branch_name}) - {group.parts.length}品目
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            発注は仕入先ごとに作成されます。先に仕入先を選択してください。
                        </Typography>
                    </Box>
                )}

                {/* 発注日・納期設定 */}
                {selectedSupplier && (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>発注日・納期設定</Typography>
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            <TextField
                                label="発注日"
                                type="date"
                                size="small"
                                value={orderDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 180 }}
                            />
                            <TextField
                                label="希望納期（任意）"
                                type="date"
                                size="small"
                                value={requestedDeliveryDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequestedDeliveryDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 180 }}
                                helperText="リードタイムより短い納期も設定可能"
                            />
                        </Box>
                    </Paper>
                )}

                {loadingParts && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {/* 仕入先未選択時のメッセージ */}
                {!loadingParts && selectedProductForOrder && supplierPartsGroups.length > 0 && !selectedSupplier && (
                    <Alert severity="info">
                        仕入先を選択すると、部品リストが表示されます。
                    </Alert>
                )}

                {/* 選択した仕入先の部品リスト */}
                {!loadingParts && selectedSupplierGroup && (
                    <Box>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                            部品リスト: {selectedSupplierGroup.supplier_name} ({selectedSupplierGroup.branch_name})
                            <Chip
                                size="small"
                                label={`${selectedSupplierGroup.parts.length}品目`}
                                sx={{ ml: 1 }}
                                color="primary"
                            />
                        </Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell>部品番号</TableCell>
                                        <TableCell>部品名</TableCell>
                                        <TableCell>単位</TableCell>
                                        <TableCell>発注区分</TableCell>
                                        <TableCell align="right">最小発注数</TableCell>
                                        <TableCell align="right">単価</TableCell>
                                        <TableCell align="center">リードタイム</TableCell>
                                        <TableCell align="center">納期予定</TableCell>
                                        <TableCell align="right" sx={{ width: 120 }}>発注数量</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedSupplierGroup.parts.map((part: PartForOrder, partIndex: number) => (
                                        <TableRow key={part.id}>
                                            <TableCell>{part.part_number}</TableCell>
                                            <TableCell>{part.part_name}</TableCell>
                                            <TableCell>{part.unit}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={part.order_type}
                                                    size="small"
                                                    color={part.order_type === 'SPQ' ? 'primary' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="right">{part.minimum_order_quantity}</TableCell>
                                            <TableCell align="right">
                                                {part.current_price
                                                    ? `¥${part.current_price.toLocaleString()}`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                {part.lead_time_days
                                                    ? `${part.lead_time_days}日`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                {requestedDeliveryDate ? (
                                                    <Tooltip title="希望納期が設定されています">
                                                        <Chip
                                                            size="small"
                                                            label={requestedDeliveryDate}
                                                            color="info"
                                                            variant="outlined"
                                                        />
                                                    </Tooltip>
                                                ) : part.lead_time_days ? (
                                                    <Tooltip title={`発注日 + ${part.lead_time_days}営業日`}>
                                                        <span>{calculateDeliveryDate(part.lead_time_days)}</span>
                                                    </Tooltip>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={orderQuantities[part.id] || ''}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const val = parseInt(e.target.value, 10) || 0;
                                                        setOrderQuantities((prev: Record<number, number>) => ({
                                                            ...prev,
                                                            [part.id]: val,
                                                        }));
                                                    }}
                                                    onBlur={() => onQuantityConfirm(part)}
                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                        onQuantityKeyDown(e, part);
                                                    }}
                                                    inputProps={{
                                                        min: 0,
                                                        'data-order-index': `0-${partIndex}`,
                                                    }}
                                                    sx={{ width: 100 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {!loadingParts && selectedProductForOrder && supplierPartsGroups.length === 0 && (
                    <Alert severity="info">
                        この製品に登録されている部品がありません。
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    キャンセル
                </Button>
                <Button
                    variant="contained"
                    onClick={onCreateOrders}
                    disabled={creatingOrder || !selectedProductForOrder || !selectedSupplier || Object.values(orderQuantities).every(q => q === 0)}
                    startIcon={creatingOrder ? <CircularProgress size={20} /> : <SendIcon />}
                >
                    発注作成
                </Button>
            </DialogActions>
        </Dialog>
    );
}
