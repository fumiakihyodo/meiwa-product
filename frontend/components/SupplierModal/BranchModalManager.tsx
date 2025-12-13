// components/SupplierModal/BranchModalManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SupplierBranch } from '@/types/supplier';
import { BranchDetailModal } from './BranchDetailModal'
import { BranchFormModal } from './BranchFormModal';

type ModalType = 'detail' | 'edit' | 'duplicate' | null;

interface BranchModalManagerProps {
    open: boolean;
    onClose: () => void;
    branchId: number | null;
    onSuccess?: () => void;
    initialModal?: 'detail' | 'edit' | null;
}

/**
 * 拠点詳細モーダル、編集モーダル、複製モーダルの切り替えを管理するコンポーネント
 * 
 * 最適化ポイント:
 * - すべてのコールバック関数をuseCallbackでメモ化
 * - 不要な再レンダリングを防止
 * 
 * 使用例:
 * ```tsx
 * <BranchModalManager
 *   open={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   branchId={selectedBranchId}
 *   onSuccess={handleRefresh}
 *   initialModal="detail" // または "edit"
 * />
 * ```
 */
export const BranchModalManager: React.FC<BranchModalManagerProps> = ({
    open,
    onClose,
    branchId,
    onSuccess,
    initialModal = 'detail',
}) => {
    const [currentModal, setCurrentModal] = useState<ModalType>(initialModal);
    const [currentBranch, setCurrentBranch] = useState<SupplierBranch | null>(null);

    // モーダルが開かれた時に初期モーダルをセット
    useEffect(() => {
        if (open) {
            setCurrentModal(initialModal);
        }
    }, [open, initialModal]);

    // モーダルを閉じる時にリセット（メモ化）
    const handleClose = useCallback(() => {
        setCurrentModal(null);
        setCurrentBranch(null);
        onClose();
    }, [onClose]);

    // 詳細モーダルから複製モーダルへ切り替え（メモ化）
    const handleDuplicate = useCallback((branch: SupplierBranch) => {
        setCurrentBranch(branch);
        setCurrentModal('duplicate');
    }, []);

    // 複製モーダルを閉じる（メモ化）
    const handleCloseDuplicate = useCallback(() => {
        setCurrentModal('detail');
    }, []);

    // 複製成功時の処理（メモ化）
    const handleDuplicateSuccess = useCallback(() => {
        setCurrentModal(null);
        setCurrentBranch(null);
        if (onSuccess) {
            onSuccess();
        }
        onClose();
    }, [onSuccess, onClose]);

    // 詳細モーダルまたは編集モーダルの表示判定
    const isDetailOrEditMode = currentModal === 'detail' || currentModal === 'edit';

    return (
        <>
            {/* 拠点詳細モーダル */}
            <BranchDetailModal
                open={open && isDetailOrEditMode}
                onClose={handleClose}
                branchId={branchId}
                onSuccess={onSuccess}
                onDuplicate={handleDuplicate}
                initialEditMode={currentModal === 'edit'}
            />

            {/* 複製モーダル */}
            {currentBranch && (
                <BranchFormModal
                    open={open && currentModal === 'duplicate'}
                    onClose={handleCloseDuplicate}
                    onSuccess={handleDuplicateSuccess}
                    duplicateFrom={currentBranch}
                />
            )}
        </>
    );
};