# api/customers/admin.py

from django.contrib import admin
from api.customers.models import Customer, CustomerBranch, CustomerContact


class CustomerBranchInline(admin.TabularInline):
    model = CustomerBranch
    extra = 0
    fields = ['branch_code', 'branch_name', 'branch_type', 'is_active']


class CustomerContactInline(admin.TabularInline):
    model = CustomerContact
    extra = 0
    fields = ['name', 'department', 'email', 'phone_number']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['customer_code', 'company_name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['customer_code', 'company_name']
    ordering = ['company_name']
    inlines = [CustomerBranchInline]


@admin.register(CustomerBranch)
class CustomerBranchAdmin(admin.ModelAdmin):
    list_display = ['branch_code', 'customer', 'branch_name', 'branch_type', 'is_active', 'created_at']
    list_filter = ['branch_type', 'is_active', 'created_at']
    search_fields = ['branch_code', 'branch_name', 'customer__company_name']
    ordering = ['customer', 'branch_name']
    inlines = [CustomerContactInline]


@admin.register(CustomerContact)
class CustomerContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'branch', 'department', 'email', 'phone_number', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'name_kana', 'email', 'branch__branch_name', 'branch__customer__company_name']
    ordering = ['branch', 'name']