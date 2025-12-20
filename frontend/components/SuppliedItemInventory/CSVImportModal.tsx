'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Stepper,
    Step,
    StepLabel,
    Alert,
    Typography,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
} from '@mui/material';
import {
    Upload as UploadIcon,
    CheckCircle,
    Error as ErrorIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import type {
    CSVParseResult,
    ModelInfoGroup,
    ItemsWithoutModelInfoGroup,
    SuppliedItemList,
} from '@/types/purchases';
import type { Product } from '@/types/product';

interface CSVImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (list: SuppliedItemList) => void;
}

interface ProductSelection {
    productId: number | null;
    registerUnregistered: boolean;
}

const steps = ['CSVアップロード', '製品選択', '確認', '完了'];

export default function CSVImportModal({ open, onClose, onSuccess }: CSVImportModalProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Product selection for each model_info group
    const [products, setProducts] = useState<Product[]>([]);
    const [modelInfoSelections, setModelInfoSelections] = useState<Record<string, ProductSelection>>({});
    const [noModelInfoSelection, setNoModelInfoSelection] = useState<ProductSelection>({
        productId: null,
        registerUnregistered: true,
    });

    // 初期化
    React.useEffect(() => {
        if (open) {
            fetchProducts();
            resetState();
        }
    }, [open]);

    const resetState = () => {
        setActiveStep(0);
        setCsvFile(null);
        setParseResult(null);
        setError(null);
        setModelInfoSelections({});
        setNoModelInfoSelection({ productId: null, registerUnregistered: true });
    };

    const fetchProducts = async () => {
        try {
            const data = await productApi.getProducts();
            setProducts(data);
        } catch (err) {
            console.error('製品取得エラー:', err);
        }
    };

    // Step 1: ファイルアップロード
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCsvFile(file);
            setError(null);
        }
    };

    const handleParseCSV = async () => {
        if (!csvFile) return;

        setParsing(true);
        setError(null);

        try {
            const result = await purchasesApi.parseSuppliedItemCsv(csvFile);
            setParseResult(result);

            // 各グループの初期選択を設定
            const initialSelections: Record<string, ProductSelection> = {};
            result.model_info_groups.forEach((group) => {
                initialSelections[group.model_info] = {
                    productId: group.suggested_product?.id || null,
                    registerUnregistered: true,
                };
            });
            setModelInfoSelections(initialSelections);

            setActiveStep(1); // 次のステップへ
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const error = err as { response?: { data?: { error?: string } } };
                setError(error.response?.data?.error || 'CSVの解析に失敗しました');
            } else {
                setError('CSVの解析に失敗しました');
            }
        } finally {
            setParsing(false);
        }
    };

    // Step 2: 製品選択の確認
    const handleProductConfirm = () => {
        if (!parseResult) return;

        // すべてのグループで製品が選択されているか確認
        for (const group of parseResult.model_info_groups) {
            if (!modelInfoSelections[group.model_info]?.productId) {
                setError(`機種情報「${group.model_info}」の製品を選択してください`);
                return;
            }
        }

        // model_info なしグループがある場合、製品が選択されているか確認
        if (parseResult.items_without_model_info && !noModelInfoSelection.productId) {
            setError('機種情報なしグループの製品を選択してください');
            return;
        }

        setError(null);
        setActiveStep(2); // 確認ステップへ
    };

    // Step 3: リスト作成
    const handleCreateList = async () => {
        if (!csvFile || !parseResult) return;

        setCreating(true);
        setError(null);

        try {
            // 各グループごとにリストを作成
            const createdLists: SuppliedItemList[] = [];

            // model_info グループのリストを作成
            for (const group of parseResult.model_info_groups) {
                const selection = modelInfoSelections[group.model_info];
                if (!selection?.productId) continue;

                const result = await purchasesApi.createSuppliedItemListFromCsv({
                    product_id: selection.productId,
                    issue_date: parseResult.issue_date || new Date().toISOString().split('T')[0],
                    items: group.items,
                    csv_file: csvFile,
                    register_unregistered: selection.registerUnregistered,
                    unregistered_items: selection.registerUnregistered ? group.unregistered_items : undefined,
                    product_info: [group.model_info],
                });

                createdLists.push(result);
            }

            // model_info なしグループのリストを作成
            if (parseResult.items_without_model_info && noModelInfoSelection.productId) {
                const result = await purchasesApi.createSuppliedItemListFromCsv({
                    product_id: noModelInfoSelection.productId,
                    issue_date: parseResult.issue_date || new Date().toISOString().split('T')[0],
                    items: parseResult.items_without_model_info.items,
                    csv_file: csvFile,
                    register_unregistered: noModelInfoSelection.registerUnregistered,
                    unregistered_items: noModelInfoSelection.registerUnregistered
                        ? parseResult.items_without_model_info.unregistered_items
                        : undefined,
                    product_info: [],
                });

                createdLists.push(result);
            }

            setActiveStep(3); // 完了ステップへ
            setTimeout(() => {
                // 最初に作成されたリストを返す（複数の場合は最初のもの）
                if (createdLists.length > 0) {
                    onSuccess(createdLists[0]);
                }
                onClose();
            }, 2000);
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const error = err as { response?: { data?: { error?: string } } };
                setError(error.response?.data?.error || 'リストの作成に失敗しました');
            } else {
                setError('リストの作成に失敗しました');
            }
        } finally {
            setCreating(false);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
        setError(null);
    };

    const handleCloseModal = () => {
        if (!creating && !parsing) {
            onClose();
        }
    };

    const getProductById = (id: number | null): Product | undefined => {
        if (!id) return undefined;
        return products.find((p) => p.id === id);
    };

    return (
        <Dialog open={open} onClose={handleCloseModal} maxWidth="md" fullWidth>
            <DialogTitle>支給品リスト CSVインポート</DialogTitle>

            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Step 0: CSVアップロード */}
                {activeStep === 0 && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>CSVファイル形式：</strong>
                            </Typography>
                            <Typography variant="body2" component="div">
                                • 1列目: 発行日<br />
                                • 6列目: 品番<br />
                                • 7列目: 品名<br />
                                • 23列目: 支給数<br />
                                • 24列目: 単位<br />
                                • 27列目: 機種情報（製品名）
                            </Typography>
                        </Alert>

                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<UploadIcon />}
                            fullWidth
                            sx={{ mb: 2, py: 2 }}
                        >
                            CSVファイルを選択
                            <input
                                type="file"
                                accept=".csv"
                                hidden
                                onChange={handleFileSelect}
                            />
                        </Button>

                        {csvFile && (
                            <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                                <Typography variant="body2">
                                    <CheckCircle color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    選択されたファイル: <strong>{csvFile.name}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    サイズ: {(csvFile.size / 1024).toFixed(2)} KB
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                )}

                {/* Step 1: 製品選択 */}
                {activeStep === 1 && parseResult && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            CSVから抽出された情報
                        </Typography>

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                発行日: {parseResult.issue_date || '不明'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                機種グループ数: {parseResult.model_info_groups.length}件
                                {parseResult.items_without_model_info && ' + 機種情報なし: 1件'}
                            </Typography>
                        </Box>

                        {/* model_info グループごとの製品選択 */}
                        {parseResult.model_info_groups.map((group, index) => (
                            <Accordion key={group.model_info} defaultExpanded={index === 0} sx={{ mb: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            機種: {group.model_info}
                                        </Typography>
                                        <Chip
                                            label={`${group.total_items}品目`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                        {group.suggested_product && (
                                            <Chip
                                                label={
                                                    group.suggested_product.match_type === 'exact'
                                                        ? '完全一致'
                                                        : '推奨'
                                                }
                                                size="small"
                                                color={
                                                    group.suggested_product.match_type === 'exact'
                                                        ? 'success'
                                                        : 'info'
                                                }
                                            />
                                        )}
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box>
                                        <FormControl fullWidth sx={{ mb: 2 }}>
                                            <InputLabel>製品を選択 *</InputLabel>
                                            <Select
                                                value={modelInfoSelections[group.model_info]?.productId || ''}
                                                label="製品を選択 *"
                                                onChange={(e) => {
                                                    const newSelections = { ...modelInfoSelections };
                                                    newSelections[group.model_info] = {
                                                        ...newSelections[group.model_info],
                                                        productId: Number(e.target.value),
                                                    };
                                                    setModelInfoSelections(newSelections);
                                                }}
                                            >
                                                {group.suggested_product && (
                                                    <MenuItem
                                                        key={`suggested-${group.suggested_product.id}`}
                                                        value={group.suggested_product.id}
                                                    >
                                                        <Chip
                                                            label={
                                                                group.suggested_product.match_type === 'exact'
                                                                    ? '完全一致'
                                                                    : '推奨'
                                                            }
                                                            color={
                                                                group.suggested_product.match_type === 'exact'
                                                                    ? 'success'
                                                                    : 'primary'
                                                            }
                                                            size="small"
                                                            sx={{ mr: 1 }}
                                                        />
                                                        {group.suggested_product.product_number} -{' '}
                                                        {group.suggested_product.product_name}
                                                    </MenuItem>
                                                )}
                                                {group.suggested_product && products.length > 0 && (
                                                    <MenuItem disabled>
                                                        <em>--- すべての製品 ---</em>
                                                    </MenuItem>
                                                )}
                                                {products.map((product) => (
                                                    <MenuItem key={product.id} value={product.id}>
                                                        {product.product_number} - {product.product_name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        {group.unregistered_items && group.unregistered_items.length > 0 && (
                                            <Alert severity="warning" sx={{ mb: 2 }}>
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>{group.unregistered_items.length}件の未登録品番があります</strong>
                                                </Typography>
                                                <TableContainer sx={{ maxHeight: 150, mt: 1 }}>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>品番</TableCell>
                                                                <TableCell>品名</TableCell>
                                                                <TableCell align="right">数量</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {group.unregistered_items.slice(0, 3).map((item, idx) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell>{item.item_number}</TableCell>
                                                                    <TableCell>{item.item_name}</TableCell>
                                                                    <TableCell align="right">{item.quantity}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                                {group.unregistered_items.length > 3 && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        ... 他 {group.unregistered_items.length - 3} 件
                                                    </Typography>
                                                )}
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={
                                                                modelInfoSelections[group.model_info]
                                                                    ?.registerUnregistered || false
                                                            }
                                                            onChange={(e) => {
                                                                const newSelections = { ...modelInfoSelections };
                                                                newSelections[group.model_info] = {
                                                                    ...newSelections[group.model_info],
                                                                    registerUnregistered: e.target.checked,
                                                                };
                                                                setModelInfoSelections(newSelections);
                                                            }}
                                                        />
                                                    }
                                                    label="未登録品番をマスターに自動登録する"
                                                    sx={{ mt: 1 }}
                                                />
                                            </Alert>
                                        )}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        ))}

                        {/* model_info なしグループ */}
                        {parseResult.items_without_model_info && (
                            <Accordion defaultExpanded={parseResult.model_info_groups.length === 0} sx={{ mb: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            機種情報なし
                                        </Typography>
                                        <Chip
                                            label={`${parseResult.items_without_model_info.total_items}品目`}
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                        />
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box>
                                        <FormControl fullWidth sx={{ mb: 2 }}>
                                            <InputLabel>製品を選択 *</InputLabel>
                                            <Select
                                                value={noModelInfoSelection.productId || ''}
                                                label="製品を選択 *"
                                                onChange={(e) => {
                                                    setNoModelInfoSelection({
                                                        ...noModelInfoSelection,
                                                        productId: Number(e.target.value),
                                                    });
                                                }}
                                            >
                                                {products.map((product) => (
                                                    <MenuItem key={product.id} value={product.id}>
                                                        {product.product_number} - {product.product_name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        {parseResult.items_without_model_info.unregistered_items &&
                                            parseResult.items_without_model_info.unregistered_items.length > 0 && (
                                                <Alert severity="warning" sx={{ mb: 2 }}>
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>
                                                            {parseResult.items_without_model_info.unregistered_items.length}
                                                            件の未登録品番があります
                                                        </strong>
                                                    </Typography>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={noModelInfoSelection.registerUnregistered}
                                                                onChange={(e) => {
                                                                    setNoModelInfoSelection({
                                                                        ...noModelInfoSelection,
                                                                        registerUnregistered: e.target.checked,
                                                                    });
                                                                }}
                                                            />
                                                        }
                                                        label="未登録品番をマスターに自動登録する"
                                                        sx={{ mt: 1 }}
                                                    />
                                                </Alert>
                                            )}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        )}
                    </Box>
                )}

                {/* Step 2: 確認 */}
                {activeStep === 2 && parseResult && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            以下の内容で支給品リストを作成します。
                        </Alert>

                        {/* model_info グループごとの確認 */}
                        {parseResult.model_info_groups.map((group) => {
                            const selection = modelInfoSelections[group.model_info];
                            const selectedProduct = getProductById(selection?.productId || null);

                            return (
                                <Paper key={group.model_info} sx={{ p: 2, mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom color="primary">
                                        機種: {group.model_info}
                                    </Typography>
                                    <Typography variant="body2">
                                        製品: {selectedProduct?.product_number} - {selectedProduct?.product_name}
                                    </Typography>
                                    <Typography variant="body2">品目数: {group.total_items}件</Typography>
                                    {group.unregistered_items && group.unregistered_items.length > 0 && (
                                        <Typography variant="body2" color="warning.main">
                                            未登録品番: {group.unregistered_items.length}件
                                            {selection?.registerUnregistered && ' (自動登録されます)'}
                                        </Typography>
                                    )}
                                </Paper>
                            );
                        })}

                        {/* model_info なしグループの確認 */}
                        {parseResult.items_without_model_info && noModelInfoSelection.productId && (
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom color="warning.main">
                                    機種情報なし
                                </Typography>
                                <Typography variant="body2">
                                    製品: {getProductById(noModelInfoSelection.productId)?.product_number} -{' '}
                                    {getProductById(noModelInfoSelection.productId)?.product_name}
                                </Typography>
                                <Typography variant="body2">
                                    品目数: {parseResult.items_without_model_info.total_items}件
                                </Typography>
                                {parseResult.items_without_model_info.unregistered_items &&
                                    parseResult.items_without_model_info.unregistered_items.length > 0 && (
                                        <Typography variant="body2" color="warning.main">
                                            未登録品番:{' '}
                                            {parseResult.items_without_model_info.unregistered_items.length}件
                                            {noModelInfoSelection.registerUnregistered && ' (自動登録されます)'}
                                        </Typography>
                                    )}
                            </Paper>
                        )}

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                リスト情報
                            </Typography>
                            <Typography variant="body2">発行日: {parseResult.issue_date}</Typography>
                            <Typography variant="body2">
                                作成リスト数:{' '}
                                {parseResult.model_info_groups.length +
                                    (parseResult.items_without_model_info ? 1 : 0)}
                                件
                            </Typography>
                        </Paper>
                    </Box>
                )}

                {/* Step 3: 完了 */}
                {activeStep === 3 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            インポート完了
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            支給品リストが正常に作成されました。
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                {activeStep < 3 && (
                    <>
                        <Button onClick={handleCloseModal} disabled={parsing || creating}>
                            キャンセル
                        </Button>
                        {activeStep > 0 && activeStep < 2 && (
                            <Button onClick={handleBack} disabled={parsing || creating}>
                                戻る
                            </Button>
                        )}
                        {activeStep === 0 && (
                            <Button
                                variant="contained"
                                onClick={handleParseCSV}
                                disabled={!csvFile || parsing}
                                startIcon={parsing ? <CircularProgress size={20} /> : null}
                            >
                                {parsing ? '解析中...' : '次へ'}
                            </Button>
                        )}
                        {activeStep === 1 && (
                            <Button
                                variant="contained"
                                onClick={handleProductConfirm}
                                disabled={parsing || creating}
                            >
                                次へ
                            </Button>
                        )}
                        {activeStep === 2 && (
                            <Button
                                variant="contained"
                                onClick={handleCreateList}
                                disabled={creating}
                                startIcon={creating ? <CircularProgress size={20} /> : null}
                            >
                                {creating ? '作成中...' : 'リスト作成'}
                            </Button>
                        )}
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}
