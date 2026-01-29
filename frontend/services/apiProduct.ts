// services/apiServices.ts

import apiClient from './api';
import {
    Product,
    ProductCreateData,
    ProductUpdateData,
} from '@/types/product';

import {
    PaginatedResponse,
} from '@/types/business'


// Product API
export const productApi = {
    getProducts: async (params?: { status?: string; search?: string; customer?: string; customer_branch?: string; include_discontinued?: boolean }): Promise<Product[]> => {
        const response = await apiClient.get<PaginatedResponse<Product>>('/products/', { params });
        return response.data.results;
    },

    getProduct: async (id: number): Promise<Product> => {
        const response = await apiClient.get<Product>(`/products/${id}/`);
        return response.data;
    },

    createProduct: async (data: ProductCreateData): Promise<Product> => {
        const response = await apiClient.post<Product>('/products/', data);
        return response.data;
    },

    updateProduct: async (id: number, data: ProductUpdateData): Promise<Product> => {
        const response = await apiClient.patch<Product>(`/products/${id}/`, data);
        return response.data;
    },

    deleteProduct: async (id: number): Promise<void> => {
        await apiClient.delete(`/products/${id}/`);
    },
};