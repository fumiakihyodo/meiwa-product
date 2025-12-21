'use client';

import React, { useState, useMemo } from 'react';
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
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { purchasesApi } from '@/services/apiPurchases';
import { productApi } from '@/services/apiProduct';
import type {
    CSVParseResult,
    ModelInfoGroup,
    SuppliedItemList,
    CSVParsedItem,
    UnregisteredPartNumber,
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

// ステップラベル（製品選択ステップは動的にスキップされる可能性あり）
const ALL_STEPS = ['CSVアップロード', '製品選択', '確認', '完了'];

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

    // 製品選択が必要なグループを判定するヘルパー関数
    const groupNeedsSelection = (group: ModelInfoGroup): boolean => {
        // 完全一致の推奨製品がある場合は選択不要
        return !group.suggested_product || group.suggested_product.match_type !== 'exact';
    };

    // 製品選択ステップが必要かどうかを判定
    const needsProductSelectionStep = useMemo(() => {
        if (!parseResult) return true;

        // model_info なしグループがある場合は選択が必要
        if (parseResult.items_without_model_info && parseResult.items_without_model_info.items.length > 0) {
            return true;
        }

        // 完全一致でないグループが1つでもあれば選択が必要
        return parseResult.model_info_groups.some(group => groupNeedsSelection(group));
    }, [parseResult]);

    // 実際に表示するステップ
    const steps = useMemo(() => {
        if (needsProductSelectionStep) {
            return ALL_STEPS;
        }
        // 製品選択ステップをスキップ
        return ['CSVアップロード', '確認', '完了'];
    }, [needsProductSelectionStep]);

    // 論理的なステップから表示用のステップに変換
    const getDisplayStep = (logicalStep: number): number => {
        if (needsProductSelectionStep) return logicalStep;
        // 製品選択ステップをスキップする場合、ステップ1以降は-1する
        return logicalStep <= 0 ? logicalStep : logicalStep - 1;
    };

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

            // 製品選択が必要かどうかを判定
            const hasItemsWithoutModelInfo = result.items_without_model_info && result.items_without_model_info.items.length > 0;
            const hasGroupsNeedingSelection = result.model_info_groups.some(
                group => !group.suggested_product || group.suggested_product.match_type !== 'exact'
            );
            const needsSelection = hasItemsWithoutModelInfo || hasGroupsNeedingSelection;

            if (needsSelection) {
                setActiveStep(1); // 製品選択ステップへ
            } else {
                // 全て完全一致の場合は製品選択をスキップして確認ステップへ
                setActiveStep(2);
            }
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

        // 選択が必要なグループで製品が選択されているか確認
        for (const group of parseResult.model_info_groups) {
            // 完全一致のグループはスキップ
            if (!groupNeedsSelection(group)) continue;

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
            // 同じ製品IDを選択したグループをマージして登録するためのマップ
            const productGroupsMap: Map<number, {
                items: CSVParsedItem[];
                unregistered_items: UnregisteredPartNumber[];
                registerUnregistered: boolean;
                product_info: string[];
            }> = new Map();

            // model_info グループを製品IDでグループ化
            for (const group of parseResult.model_info_groups) {
                const selection = modelInfoSelections[group.model_info];
                if (!selection?.productId) continue;

                const existingGroup = productGroupsMap.get(selection.productId);
                if (existingGroup) {
                    // 既存のグループにマージ
                    existingGroup.items = [...existingGroup.items, ...group.items];
                    existingGroup.unregistered_items = [
                        ...existingGroup.unregistered_items,
                        ...(group.unregistered_items || [])
                    ];
                    existingGroup.registerUnregistered = existingGroup.registerUnregistered || selection.registerUnregistered;
                    existingGroup.product_info.push(group.model_info);
                } else {
                    // 新しいグループを作成
                    productGroupsMap.set(selection.productId, {
                        items: [...group.items],
                        unregistered_items: [...(group.unregistered_items || [])],
                        registerUnregistered: selection.registerUnregistered,
                        product_info: [group.model_info],
                    });
                }
            }

            // model_info なしグループも同じ製品IDならマージ
            if (parseResult.items_without_model_info && noModelInfoSelection.productId) {
                const existingGroup = productGroupsMap.get(noModelInfoSelection.productId);
                if (existingGroup) {
                    // 既存のグループにマージ
                    existingGroup.items = [...existingGroup.items, ...parseResult.items_without_model_info.items];
                    existingGroup.unregistered_items = [
                        ...existingGroup.unregistered_items,
                        ...(parseResult.items_without_model_info.unregistered_items || [])
                    ];
                    existingGroup.registerUnregistered = existingGroup.registerUnregistered || noModelInfoSelection.registerUnregistered;
                    // product_info には空文字列を追加（機種情報なしを表す）
                } else {
                    // 新しいグループを作成
                    productGroupsMap.set(noModelInfoSelection.productId, {
                        items: [...parseResult.items_without_model_info.items],
                        unregistered_items: [...(parseResult.items_without_model_info.unregistered_items || [])],
                        registerUnregistered: noModelInfoSelection.registerUnregistered,
                        product_info: [],
                    });
                }
            }

            // マージされたグループごとにリストを作成
            const createdLists: SuppliedItemList[] = [];
            for (const [productId, groupData] of productGroupsMap.entries()) {
                const result = await purchasesApi.createSuppliedItemListFromCsv({
                    product_id: productId,
                    issue_date: parseResult.issue_date || new Date().toISOString().split('T')[0],
                    items: groupData.items,
                    csv_file: csvFile,
                    register_unregistered: groupData.registerUnregistered,
                    unregistered_items: groupData.registerUnregistered ? groupData.unregistered_items : undefined,
                    product_info: groupData.product_info,
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
                <Stepper activeStep={getDisplayStep(activeStep)} sx={{ mb: 4, mt: 2 }}>
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
                            製品の選択
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

                        {/* 自動マッチング済みのグループがある場合の表示 */}
                        {parseResult.model_info_groups.some(group => !groupNeedsSelection(group)) && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                <Typography variant="body2" gutterBottom>
                                    <strong>自動マッチング済み:</strong>
                                </Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                    {parseResult.model_info_groups
                                        .filter(group => !groupNeedsSelection(group))
                                        .map(group => (
                                            <li key={group.model_info}>
                                                機種「{group.model_info}」 → {group.suggested_product?.product_number} - {group.suggested_product?.product_name}
                                                （{group.total_items}品目）
                                            </li>
                                        ))
                                    }
                                </Box>
                            </Alert>
                        )}

                        {/* 選択が必要なグループの説明 */}
                        {(parseResult.model_info_groups.some(groupNeedsSelection) || parseResult.items_without_model_info) && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                以下のグループは製品の選択が必要です。機種情報が空白または登録済み製品と一致しない項目があります。
                            </Alert>
                        )}

                        {/* model_info グループごとの製品選択（選択が必要なグループのみ） */}
                        {parseResult.model_info_groups
                            .filter(groupNeedsSelection)
                            .map((group, index) => (
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
                                        {group.suggested_product && group.suggested_product.match_type === 'partial' && (
                                            <Chip
                                                label="推奨"
                                                size="small"
                                                color="info"
                                            />
                                        )}
                                        {!group.suggested_product && (
                                            <Chip
                                                label="未登録"
                                                size="small"
                                                color="warning"
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
                                                            label="推奨"
                                                            color="primary"
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
                            <Accordion defaultExpanded={parseResult.model_info_groups.filter(groupNeedsSelection).length === 0} sx={{ mb: 2 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            機種情報なし（空白）
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
                            {(() => {
                                // マージ後のリスト数を計算
                                const productIds = new Set<number>();
                                parseResult.model_info_groups.forEach(group => {
                                    const productId = modelInfoSelections[group.model_info]?.productId;
                                    if (productId) productIds.add(productId);
                                });
                                if (parseResult.items_without_model_info && noModelInfoSelection.productId) {
                                    productIds.add(noModelInfoSelection.productId);
                                }
                                const originalCount = parseResult.model_info_groups.length + (parseResult.items_without_model_info ? 1 : 0);
                                const mergedCount = productIds.size;
                                if (mergedCount < originalCount) {
                                    return (
                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                            ※ 同じ製品を選択したグループはまとめて1つのリストとして登録されます。
                                        </Typography>
                                    );
                                }
                                return null;
                            })()}
                        </Alert>

                        {/* マージされる製品ごとの確認 */}
                        {(() => {
                            // 製品IDでグループ化してマージ結果をプレビュー
                            const productGroupsPreview: Map<number, {
                                product: Product | undefined;
                                modelInfos: string[];
                                hasNoModelInfo: boolean;
                                totalItems: number;
                                totalUnregistered: number;
                                willRegisterUnregistered: boolean;
                            }> = new Map();

                            parseResult.model_info_groups.forEach(group => {
                                const selection = modelInfoSelections[group.model_info];
                                if (!selection?.productId) return;

                                const existing = productGroupsPreview.get(selection.productId);
                                if (existing) {
                                    existing.modelInfos.push(group.model_info);
                                    existing.totalItems += group.total_items;
                                    existing.totalUnregistered += (group.unregistered_items?.length || 0);
                                    existing.willRegisterUnregistered = existing.willRegisterUnregistered || selection.registerUnregistered;
                                } else {
                                    productGroupsPreview.set(selection.productId, {
                                        product: getProductById(selection.productId),
                                        modelInfos: [group.model_info],
                                        hasNoModelInfo: false,
                                        totalItems: group.total_items,
                                        totalUnregistered: group.unregistered_items?.length || 0,
                                        willRegisterUnregistered: selection.registerUnregistered,
                                    });
                                }
                            });

                            if (parseResult.items_without_model_info && noModelInfoSelection.productId) {
                                const existing = productGroupsPreview.get(noModelInfoSelection.productId);
                                if (existing) {
                                    existing.hasNoModelInfo = true;
                                    existing.totalItems += parseResult.items_without_model_info.total_items;
                                    existing.totalUnregistered += (parseResult.items_without_model_info.unregistered_items?.length || 0);
                                    existing.willRegisterUnregistered = existing.willRegisterUnregistered || noModelInfoSelection.registerUnregistered;
                                } else {
                                    productGroupsPreview.set(noModelInfoSelection.productId, {
                                        product: getProductById(noModelInfoSelection.productId),
                                        modelInfos: [],
                                        hasNoModelInfo: true,
                                        totalItems: parseResult.items_without_model_info.total_items,
                                        totalUnregistered: parseResult.items_without_model_info.unregistered_items?.length || 0,
                                        willRegisterUnregistered: noModelInfoSelection.registerUnregistered,
                                    });
                                }
                            }

                            return Array.from(productGroupsPreview.entries()).map(([productId, data]) => (
                                <Paper key={productId} sx={{ p: 2, mb: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
                                        リスト: {data.product?.product_number} - {data.product?.product_name}
                                    </Typography>
                                    <Box sx={{ pl: 2 }}>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>品目数:</strong> {data.totalItems}件
                                        </Typography>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>含まれる機種情報:</strong>
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                            {data.modelInfos.map(modelInfo => (
                                                <li key={modelInfo}>
                                                    <Typography variant="body2">{modelInfo}</Typography>
                                                </li>
                                            ))}
                                            {data.hasNoModelInfo && (
                                                <li>
                                                    <Typography variant="body2" color="warning.main">機種情報なし（空白）</Typography>
                                                </li>
                                            )}
                                        </Box>
                                        {data.totalUnregistered > 0 && (
                                            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                                                未登録品番: {data.totalUnregistered}件
                                                {data.willRegisterUnregistered && ' (自動登録されます)'}
                                            </Typography>
                                        )}
                                    </Box>
                                </Paper>
                            ));
                        })()}

                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                リスト情報
                            </Typography>
                            <Typography variant="body2">発行日: {parseResult.issue_date}</Typography>
                            <Typography variant="body2">
                                作成リスト数:{' '}
                                {(() => {
                                    const productIds = new Set<number>();
                                    parseResult.model_info_groups.forEach(group => {
                                        const productId = modelInfoSelections[group.model_info]?.productId;
                                        if (productId) productIds.add(productId);
                                    });
                                    if (parseResult.items_without_model_info && noModelInfoSelection.productId) {
                                        productIds.add(noModelInfoSelection.productId);
                                    }
                                    return productIds.size;
                                })()}
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
