// hooks/useFetchData.ts
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface UseFetchDataOptions<T, P = void> {
    fetchFn: (params?: P) => Promise<T>;
    errorMessage: string;
    redirectOnError?: string;
    validateId?: number | null;
}

export const useFetchData = <T, P = void>({
    fetchFn,
    errorMessage,
    redirectOnError,
    validateId,
}: UseFetchDataOptions<T, P>) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    
    // fetchFnをrefに保存して、依存配列から除外
    const fetchFnRef = useRef(fetchFn);
    fetchFnRef.current = fetchFn;

    const fetch = useCallback(async (params?: P) => {
        // IDの検証
        if (validateId !== undefined && (!validateId || isNaN(validateId))) {
            toast.error('無効なIDです');
            if (redirectOnError) {
                router.push(redirectOnError);
            }
            return;
        }

        setLoading(true);
        try {
            const result = await fetchFnRef.current(params);
            setData(result);
        } catch (error) {
            console.error('データ取得エラー:', error);
            toast.error(errorMessage);
            if (redirectOnError) {
                router.push(redirectOnError);
            }
        } finally {
            setLoading(false);
        }
    }, [errorMessage, redirectOnError, validateId, router]); // fetchFnを除外

    return { data, loading, fetch };
};