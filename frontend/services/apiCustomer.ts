// services/apiCustomer.ts

import apiClient from './api';
import {
    Customer,
    CustomerCreateData,
    CustomerUpdateData,
    CustomerBranch,
    CustomerBranchCreateData,
    CustomerBranchUpdateData,
    CustomerContact,
    CustomerContactCreateData,
    CustomerContactUpdateData,
} from '@/types/customer';

import {
    PaginatedResponse,
} from '@/types/business'

// Customer API
export const customerApi = {
    getCustomers: async (params?: { 
        is_active?: boolean; 
        search?: string 
    }): Promise<Customer[]> => {
        const response = await apiClient.get<PaginatedResponse<Customer>>('/customers/', { params });
        return response.data.results;
    },

    getCustomer: async (id: number): Promise<Customer> => {
        const response = await apiClient.get<Customer>(`/customers/${id}/`);
        return response.data;
    },

    createCustomer: async (data: CustomerCreateData): Promise<Customer> => {
        const response = await apiClient.post<Customer>('/customers/', data);
        return response.data;
    },

    updateCustomer: async (id: number, data: CustomerUpdateData): Promise<Customer> => {
        const response = await apiClient.patch<Customer>(`/customers/${id}/`, data);
        return response.data;
    },

    deleteCustomer: async (id: number): Promise<void> => {
        await apiClient.delete(`/customers/${id}/`);
    },
};

// CustomerBranch API
export const customerBranchApi = {
    getBranches: async (params?: {
        customer?: number;
        branch_type?: string;
        is_active?: boolean;
        search?: string;
    }): Promise<CustomerBranch[]> => {
        const response = await apiClient.get<PaginatedResponse<CustomerBranch>>('/customers/branches/', { params });
        return response.data.results;
    },

    getBranch: async (id: number): Promise<CustomerBranch> => {
        const response = await apiClient.get<CustomerBranch>(`/customers/branches/${id}/`);
        return response.data;
    },

    createBranch: async (data: CustomerBranchCreateData): Promise<CustomerBranch> => {
        const response = await apiClient.post<CustomerBranch>('/customers/branches/', data);
        return response.data;
    },

    updateBranch: async (id: number, data: CustomerBranchUpdateData): Promise<CustomerBranch> => {
        const response = await apiClient.patch<CustomerBranch>(`/customers/branches/${id}/`, data);
        return response.data;
    },

    deleteBranch: async (id: number): Promise<void> => {
        await apiClient.delete(`/customers/branches/${id}/`);
    },
};

// CustomerContact API
export const customerContactApi = {
    getContacts: async (params?: {
        branch?: number;
        customer?: number;
        search?: string;
    }): Promise<CustomerContact[]> => {
        const response = await apiClient.get<PaginatedResponse<CustomerContact>>('/customers/contacts/', { params });
        return response.data.results;
    },

    getContact: async (id: number): Promise<CustomerContact> => {
        const response = await apiClient.get<CustomerContact>(`/customers/contacts/${id}/`);
        return response.data;
    },

    createContact: async (data: CustomerContactCreateData): Promise<CustomerContact> => {
        const response = await apiClient.post<CustomerContact>('/customers/contacts/', data);
        return response.data;
    },

    updateContact: async (id: number, data: CustomerContactUpdateData): Promise<CustomerContact> => {
        const response = await apiClient.patch<CustomerContact>(`/customers/contacts/${id}/`, data);
        return response.data;
    },

    deleteContact: async (id: number): Promise<void> => {
        await apiClient.delete(`/customers/contacts/${id}/`);
    },
};