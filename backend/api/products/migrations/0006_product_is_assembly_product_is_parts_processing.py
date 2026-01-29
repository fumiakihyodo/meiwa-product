# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_rename_products_model_i_a1b2c3_idx_products_model_i_26a2e4_idx'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_assembly',
            field=models.BooleanField(default=False, help_text='組立製品かどうか', verbose_name='組立'),
        ),
        migrations.AddField(
            model_name='product',
            name='is_parts_processing',
            field=models.BooleanField(default=False, help_text='部品加工製品かどうか', verbose_name='部品加工'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['is_assembly'], name='products_is_asse_f8d9e2_idx'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['is_parts_processing'], name='products_is_part_a3c4b1_idx'),
        ),
    ]
