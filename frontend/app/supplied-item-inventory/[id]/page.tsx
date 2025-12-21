'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Button,
    Paper,
    Grid,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    TextField,
    Checkbox,
    Divider,
    Card,
    CardContent,
    LinearProgress,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import {
    ArrowBack as BackIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    Save as SaveIcon,
    Check as CheckIcon,
    Clear as ClearIcon,
    CheckCircle as CheckCircleIcon,
    Inventory as InventoryIcon,
} from '@mui/icons-material';
import MainLayout from '@/components/layout/MainLayout';
import { purchasesApi } from '@/services/apiPurchases';
import {
    SuppliedItemList,
    SuppliedItemListItem,
    SuppliedItemListStatus,
    ReceivingInputRow,
    SuppliedItemReceivingCreateData,
    SuppliedItemReceiving,
} from '@/types/purchases';
import { v4 as uuidv4 } from 'uuid';

// タブパネル
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

// ステータス表示用のChip
const StatusChip: React.FC<{ status: SuppliedItemListStatus; statusDisplay?: string }> = ({ status, statusDisplay }) => {
    const getStatusColor = (status: SuppliedItemListStatus): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
        switch (status) {
            case 'draft': return 'default';
            case 'pending_receiving': return 'warning';
            case 'receiving': return 'info';
            case 'pending_count': return 'warning';
            case 'counting': return 'info';
            case 'completed': return 'success';
            case 'cancelled': return 'error';
            default: return 'default';
        }
    };

    return (
        <Chip
            label={statusDisplay || status}
            color={getStatusColor(status)}
            size="small"
        />
    );
};

// 空の受入入力行を作成
const createEmptyRow = (): ReceivingInputRow => ({
    id: uuidv4(),
    item_number: '',
    quantity_per_box: '',
    box_count: '',
    calculated_quantity: 0,
    notes: '',
});

export default function SuppliedItemListDetailPage() {
    const params = useParams();
    const router = useRouter();
    const listId = Number(params.id);

    // タブ状態
    const [tabValue, setTabValue] = useState(0);

    // データ
    const [list, setList] = useState<SuppliedItemList | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // 受入確認フォーム
    const [receivingRows, setReceivingRows] = useState<ReceivingInputRow[]>([createEmptyRow()]);
    const [draftReceiving, setDraftReceiving] = useState<SuppliedItemReceiving | null>(null);

    // 員数確認
    const [countConfirmLoading, setCountConfirmLoading] = useState<{ [key: number]: boolean }>({});

    // 在庫登録
    const [registeringInventory, setRegisteringInventory] = useState(false);

    // データ取得
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [listData, receivingsData] = await Promise.all([
                purchasesApi.getSuppliedItemList(listId),
                purchasesApi.getSuppliedItemReceivings({ list: listId, status: 'draft' }),
            ]);
            setList(listData);

            // 一時保存があれば復元
            if (receivingsData.length > 0) {
                const draft = receivingsData[0];
                setDraftReceiving(draft);
                if (draft.items && draft.items.length > 0) {
                    setReceivingRows(draft.items.map(item => ({
                        id: uuidv4(),
                        item_number: item.item_number,
                        quantity_per_box: item.quantity_per_box,
                        box_count: item.box_count,
                        calculated_quantity: item.calculated_quantity,
                        list_item_id: item.list_item || undefined,
                        notes: item.notes || '',
                    })));
                }
            }
        } catch (err) {
            setError('データの取得に失敗しました');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [listId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 受入入力行の更新
    const updateReceivingRow = (id: string, field: keyof ReceivingInputRow, value: string | number) => {
        setReceivingRows(rows => {
            const newRows = rows.map(row => {
                if (row.id !== id) return row;

                const updatedRow = { ...row, [field]: value };

                // 数量を自動計算
                const qtyPerBox = typeof updatedRow.quantity_per_box === 'number' ? updatedRow.quantity_per_box : 0;
                const boxCount = typeof updatedRow.box_count === 'number' ? updatedRow.box_count : 0;
                updatedRow.calculated_quantity = qtyPerBox * boxCount;

                // リスト項目との紐付け
                if (field === 'item_number' && list?.items) {
                    const matchedItem = list.items.find(item => item.item_number === value);
                    if (matchedItem) {
                        updatedRow.list_item_id = matchedItem.id;
                    }
                }

                return updatedRow;
            });

            // 最後の行に入力があったら新しい行を追加
            const lastRow = newRows[newRows.length - 1];
            if (lastRow.item_number && lastRow.quantity_per_box && lastRow.box_count) {
                newRows.push(createEmptyRow());
            }

            return newRows;
        });
    };

    // 行の削除
    const removeReceivingRow = (id: string) => {
        setReceivingRows(rows => {
            if (rows.length <= 1) return rows;
            return rows.filter(row => row.id !== id);
        });
    };

    // 一時保存
    const handleSaveDraft = async () => {
        setSaving(true);
        setError(null);
        try {
            const validRows = receivingRows.filter(row =>
                row.item_number &&
                typeof row.quantity_per_box === 'number' &&
                typeof row.box_count === 'number'
            );

            const data: SuppliedItemReceivingCreateData = {
                supplied_item_list: listId,
                status: 'draft',
                items: validRows.map(row => ({
                    list_item: row.list_item_id,
                    item_number: row.item_number,
                    quantity_per_box: row.quantity_per_box as number,
                    box_count: row.box_count as number,
                    notes: row.notes,
                })),
            };

            if (draftReceiving) {
                await purchasesApi.updateSuppliedItemReceiving(draftReceiving.id, data);
            } else {
                const created = await purchasesApi.createSuppliedItemReceiving(data);
                setDraftReceiving(created);
            }

            setSuccessMessage('一時保存しました');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError('保存に失敗しました');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // 受入確認完了
    const handleCompleteReceiving = async () => {
        if (!draftReceiving) {
            // まず保存してから完了
            await handleSaveDraft();
        }

        setSaving(true);
        setError(null);
        try {
            if (draftReceiving) {
                await purchasesApi.completeReceiving(draftReceiving.id);
                setSuccessMessage('受入確認が完了しました');
                setDraftReceiving(null);
                setReceivingRows([createEmptyRow()]);
                fetchData();
            }
        } catch (err) {
            setError('受入確認の完了に失敗しました');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // 員数確認
    const handleCountConfirm = async (itemId: number, confirmed: boolean) => {
        setCountConfirmLoading(prev => ({ ...prev, [itemId]: true }));
        try {
            await purchasesApi.confirmCountListItem(itemId, { count_confirmed: confirmed });
            fetchData();
        } catch (err) {
            setError('員数確認の更新に失敗しました');
            console.error(err);
        } finally {
            setCountConfirmLoading(prev => ({ ...prev, [itemId]: false }));
        }
    };

    // 在庫登録
    const handleRegisterInventory = async () => {
        setRegisteringInventory(true);
        setError(null);
        try {
            const result = await purchasesApi.registerInventoryFromList(listId);
            setSuccessMessage(result.message);
            fetchData();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : '在庫登録に失敗しました';
            setError(errorMessage);
            console.error(err);
        } finally {
            setRegisteringInventory(false);
        }
    };

    // リスト項目カラム
    const itemColumns: GridColDef[] = [
        { field: 'item_number', headerName: '品番', width: 150 },
        { field: 'item_name', headerName: '品名', width: 200 },
        { field: 'quantity', headerName: 'リスト数量', width: 100, type: 'number' },
        { field: 'received_quantity', headerName: '受入数量', width: 100, type: 'number' },
        {
            field: 'is_quantity_matched',
            headerName: '数量一致',
            width: 100,
            renderCell: (params: GridRenderCellParams<SuppliedItemListItem>) => {
                if (params.value === null) return '-';
                return params.value ? (
                    <CheckCircleIcon color="success" />
                ) : (
                    <ClearIcon color="error" />
                );
            },
        },
        {
            field: 'receiving_confirmed',
            headerName: '受入確認',
            width: 100,
            renderCell: (params: GridRenderCellParams<SuppliedItemListItem>) => (
                params.value ? (
                    <Chip label="済" color="success" size="small" />
                ) : (
                    <Chip label="未" color="default" size="small" />
                )
            ),
        },
        {
            field: 'count_confirmed',
            headerName: '員数確認',
            width: 120,
            renderCell: (params: GridRenderCellParams<SuppliedItemListItem>) => {
                const isLoading = countConfirmLoading[params.row.id];
                if (isLoading) return <CircularProgress size={20} />;

                return (
                    <Checkbox
                        checked={params.value}
                        onChange={(e) => handleCountConfirm(params.row.id, e.target.checked)}
                        disabled={!params.row.receiving_confirmed}
                    />
                );
            },
        },
        { field: 'unit', headerName: '単位', width: 80 },
        { field: 'notes', headerName: '備考', width: 150, flex: 1 },
    ];

    if (loading) {
        return (
            <MainLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            </MainLayout>
        );
    }

    if (!list) {
        return (
            <MainLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">リストが見つかりません</Alert>
                    <Button startIcon={<BackIcon />} onClick={() => router.push('/supplied-item-inventory')} sx={{ mt: 2 }}>
                        一覧に戻る
                    </Button>
                </Box>
            </MainLayout>
        );
    }

    const totalItems = list.total_items || 0;
    const receivedCount = list.received_items_count || 0;
    const countedCount = list.count_confirmed_items_count || 0;
    const allReceived = receivedCount === totalItems && totalItems > 0;
    const allCounted = countedCount === totalItems && totalItems > 0;

    return (
        <MainLayout>
            <Box sx={{ p: 3 }}>
                {/* ヘッダー */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => router.push('/supplied-item-inventory')}>
                            <BackIcon />
                        </IconButton>
                        <Typography variant="h5">{list.list_number}</Typography>
                        <StatusChip status={list.status} statusDisplay={list.status_display} />
                    </Box>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
                        更新
                    </Button>
                </Box>

                {/* アラート */}
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

                {/* 基本情報 */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">製品</Typography>
                            <Typography>
                                {list.product_number && list.product_name
                                    ? `${list.product_number} - ${list.product_name}`
                                    : list.product_name || '-'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">取引先</Typography>
                            <Typography>{list.customer_name || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">納品予定日</Typography>
                            <Typography>{list.delivery_date || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">品番数 / 合計数量</Typography>
                            <Typography>{totalItems}品番 / {list.total_quantity || 0}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="text.secondary">進捗</Typography>
                            <Box>
                                <Typography variant="body2">受入: {receivedCount}/{totalItems}</Typography>
                                <LinearProgress variant="determinate" value={totalItems > 0 ? (receivedCount / totalItems) * 100 : 0} sx={{ mb: 0.5 }} />
                                <Typography variant="body2">員数: {countedCount}/{totalItems}</Typography>
                                <LinearProgress variant="determinate" value={totalItems > 0 ? (countedCount / totalItems) * 100 : 0} />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* タブ */}
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab label="リスト項目" />
                    <Tab label="受入確認入力" disabled={list.status === 'completed'} />
                    <Tab label="在庫登録" disabled={!allCounted} />
                </Tabs>

                {/* リスト項目タブ */}
                <TabPanel value={tabValue} index={0}>
                    <Paper sx={{ height: 400 }}>
                        <DataGrid
                            rows={list.items || []}
                            columns={itemColumns}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: { paginationModel: { pageSize: 10 } },
                            }}
                            disableRowSelectionOnClick
                        />
                    </Paper>
                </TabPanel>

                {/* 受入確認入力タブ */}
                <TabPanel value={tabValue} index={1}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">受入確認入力</Typography>
                                {draftReceiving && (
                                    <Chip label="一時保存あり" color="info" size="small" />
                                )}
                            </Box>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                品番を入力し、入数と箱数を入力すると数量が自動計算されます。<br />
                                入力が完了したら次の行が自動追加されます。休憩時は「一時保存」を押してください。
                            </Alert>

                            {/* 入力フォーム */}
                            <Box sx={{ mb: 2 }}>
                                {receivingRows.map((row, index) => (
                                    <Box key={row.id} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                        <Typography sx={{ width: 30, textAlign: 'center' }}>{index + 1}</Typography>
                                        <TextField
                                            label="品番"
                                            size="small"
                                            value={row.item_number}
                                            onChange={(e) => updateReceivingRow(row.id, 'item_number', e.target.value)}
                                            sx={{ width: 150 }}
                                        />
                                        <TextField
                                            label="入数"
                                            size="small"
                                            type="number"
                                            value={row.quantity_per_box}
                                            onChange={(e) => updateReceivingRow(row.id, 'quantity_per_box', parseInt(e.target.value) || '')}
                                            sx={{ width: 100 }}
                                        />
                                        <Typography>×</Typography>
                                        <TextField
                                            label="箱数"
                                            size="small"
                                            type="number"
                                            value={row.box_count}
                                            onChange={(e) => updateReceivingRow(row.id, 'box_count', parseInt(e.target.value) || '')}
                                            sx={{ width: 100 }}
                                        />
                                        <Typography>=</Typography>
                                        <TextField
                                            label="数量"
                                            size="small"
                                            value={row.calculated_quantity}
                                            InputProps={{ readOnly: true }}
                                            sx={{ width: 100 }}
                                        />
                                        <TextField
                                            label="備考"
                                            size="small"
                                            value={row.notes || ''}
                                            onChange={(e) => updateReceivingRow(row.id, 'notes', e.target.value)}
                                            sx={{ flex: 1 }}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={() => removeReceivingRow(row.id)}
                                            disabled={receivingRows.length <= 1}
                                        >
                                            <ClearIcon />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* ボタン */}
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSaveDraft}
                                    disabled={saving}
                                >
                                    一時保存
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<CheckIcon />}
                                    onClick={handleCompleteReceiving}
                                    disabled={saving || receivingRows.filter(r => r.item_number).length === 0}
                                >
                                    受入確認完了
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </TabPanel>

                {/* 在庫登録タブ */}
                <TabPanel value={tabValue} index={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>在庫登録</Typography>

                            {!allCounted ? (
                                <Alert severity="warning">
                                    すべての項目の員数確認が完了するまで在庫登録はできません。<br />
                                    現在: {countedCount}/{totalItems} 完了
                                </Alert>
                            ) : (
                                <>
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        すべての員数確認が完了しました。在庫登録ボタンをクリックして在庫を登録してください。
                                    </Alert>
                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={<InventoryIcon />}
                                            onClick={handleRegisterInventory}
                                            disabled={registeringInventory || list.status === 'completed'}
                                        >
                                            {registeringInventory ? <CircularProgress size={24} /> : '在庫を登録する'}
                                        </Button>
                                    </Box>
                                    {list.status === 'completed' && (
                                        <Alert severity="success" sx={{ mt: 2 }}>
                                            このリストの在庫登録は完了しています。
                                        </Alert>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabPanel>
            </Box>
        </MainLayout>
    );
}
