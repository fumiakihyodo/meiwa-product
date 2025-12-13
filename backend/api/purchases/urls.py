# api/purchases/urls.py

from django.urls import path
from api.purchases.views import (
    PartListCreateView,
    PartDetailView,
    PriceHistoryListCreateView,
    PriceHistoryDetailView,
)
from api.purchases import views

app_name = 'purchases'

urlpatterns = [
    # 部品関連
    path('parts/', PartListCreateView.as_view(), name='part_list_create'),
    path('parts/<int:pk>/', PartDetailView.as_view(), name='part_detail'),
    
    # 価格履歴関連
    path('price-histories/', PriceHistoryListCreateView.as_view(), name='price_history_list_create'),
    path('price-histories/<int:pk>/', PriceHistoryDetailView.as_view(), name='price_history_detail'),

    # Quote file download - この行を追加
    path('price-histories/<int:pk>/quote-file/', views.download_quote_file, name='price-history-quote-file'),
]
