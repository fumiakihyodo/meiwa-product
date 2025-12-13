import apiClient from './api';
import {
    Supplier,
    SupplierBranch,
    SupplierContact,
    SupplierCreateData,
    SupplierUpdateData,
    SupplierBranchCreateData,
    SupplierBranchUpdateData,
    SupplierContactCreateData,
    SupplierContactUpdateData,
} from '@/types/supplier';

import {
    PaginatedResponse,
} from '@/types/business'

// Supplier API
export const supplierApi = {
    // Suppliers
    getSuppliers: async (params?: { is_active?: string; search?: string }): Promise<Supplier[]> => {
        const response = await apiClient.get<PaginatedResponse<Supplier>>('/supplier/suppliers/', { params });
        return response.data.results;
    },

    getSupplier: async (id: number): Promise<Supplier> => {
        const response = await apiClient.get<Supplier>(`/supplier/suppliers/${id}/`);
        return response.data;
    },

    createSupplier: async (data: SupplierCreateData): Promise<Supplier> => {
        const response = await apiClient.post<Supplier>('/supplier/suppliers/', data);
        return response.data;
    },

    updateSupplier: async (id: number, data: SupplierUpdateData): Promise<Supplier> => {
        const response = await apiClient.patch<Supplier>(`/supplier/suppliers/${id}/`, data);
        return response.data;
    },

    deleteSupplier: async (id: number): Promise<void> => {
        await apiClient.delete(`/supplier/suppliers/${id}/`);
    },

    // Supplier Branches
    getSupplierBranches: async (params?: { 
        supplier?: number; 
        branch_type?: string; 
        is_active?: string; 
        search?: string 
    }): Promise<SupplierBranch[]> => {
        const response = await apiClient.get<PaginatedResponse<SupplierBranch>>('/supplier/branches/', { params });
        return response.data.results;
    },

    getSupplierBranch: async (id: number): Promise<SupplierBranch> => {
        const response = await apiClient.get<SupplierBranch>(`/supplier/branches/${id}/`);
        return response.data;
    },

    createSupplierBranch: async (data: SupplierBranchCreateData): Promise<SupplierBranch> => {
        const response = await apiClient.post<SupplierBranch>('/supplier/branches/', data);
        return response.data;
    },

    updateSupplierBranch: async (id: number, data: SupplierBranchUpdateData): Promise<SupplierBranch> => {
        const response = await apiClient.patch<SupplierBranch>(`/supplier/branches/${id}/`, data);
        return response.data;
    },

    deleteSupplierBranch: async (id: number): Promise<void> => {
        await apiClient.delete(`/supplier/branches/${id}/`);
    },

    // Supplier Contacts
    getSupplierContacts: async (params?: { 
        branch?: number; 
        supplier?: number;
        responsibility?: string;
        is_active?: string; 
        is_primary?: string;
        search?: string 
    }): Promise<SupplierContact[]> => {
        const response = await apiClient.get<PaginatedResponse<SupplierContact>>('/supplier/contacts/', { params });
        return response.data.results;
    },

    getSupplierContact: async (id: number): Promise<SupplierContact> => {
        const response = await apiClient.get<SupplierContact>(`/supplier/contacts/${id}/`);
        return response.data;
    },

    createSupplierContact: async (data: SupplierContactCreateData): Promise<SupplierContact> => {
        const response = await apiClient.post<SupplierContact>('/supplier/contacts/', data);
        return response.data;
    },

    updateSupplierContact: async (id: number, data: SupplierContactUpdateData): Promise<SupplierContact> => {
        const response = await apiClient.patch<SupplierContact>(`/supplier/contacts/${id}/`, data);
        return response.data;
    },

    deleteSupplierContact: async (id: number): Promise<void> => {
        await apiClient.delete(`/supplier/contacts/${id}/`);
    },
    
};