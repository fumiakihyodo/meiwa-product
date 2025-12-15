# Generated manually

import django.core.validators
import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0005_part_supplier_part_name_alter_part_order_type'),
        ('products', '0003_remove_product_customer_product_customer_branch_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add quantity_per_product field to Part model
        migrations.AddField(
            model_name='part',
            name='quantity_per_product',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='製品1個を製造する際に必要な部品の数量',
                max_digits=10,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal('0.00'))],
                verbose_name='製品あたりの使用数'
            ),
        ),
        # Create SuppliedItem model
        migrations.CreateModel(
            name='SuppliedItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_number', models.CharField(help_text='支給品を識別する品番', max_length=100, verbose_name='品番')),
                ('item_name', models.CharField(max_length=200, verbose_name='品名')),
                ('specification', models.TextField(blank=True, help_text='支給品の詳細仕様', verbose_name='仕様')),
                ('unit', models.CharField(default='個', help_text='使用単位（個、kg、m等）', max_length=20, verbose_name='単位')),
                ('quantity_per_product', models.DecimalField(decimal_places=2, help_text='製品1個を製造する際に必要な支給品の数量', max_digits=10, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))], verbose_name='製品あたりの使用数')),
                ('is_active', models.BooleanField(default=True, help_text='この支給品が現在使用可能かどうか', verbose_name='有効')),
                ('notes', models.TextField(blank=True, verbose_name='備考')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='作成日時')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新日時')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_supplied_items', to=settings.AUTH_USER_MODEL, verbose_name='作成者')),
                ('product', models.ForeignKey(help_text='この支給品が使用される製品', on_delete=django.db.models.deletion.CASCADE, related_name='supplied_items', to='products.product', verbose_name='製品')),
            ],
            options={
                'verbose_name': '支給品',
                'verbose_name_plural': '支給品一覧',
                'db_table': 'supplied_items',
                'ordering': ['item_number'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='supplieditem',
            unique_together={('product', 'item_number')},
        ),
        migrations.AddIndex(
            model_name='supplieditem',
            index=models.Index(fields=['item_number'], name='supplied_it_item_nu_idx'),
        ),
        migrations.AddIndex(
            model_name='supplieditem',
            index=models.Index(fields=['product', 'is_active'], name='supplied_it_product_idx'),
        ),
        migrations.AddIndex(
            model_name='supplieditem',
            index=models.Index(fields=['created_at'], name='supplied_it_created_idx'),
        ),
    ]
