# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
        ('purchases', '0013_remove_supplieditemlist_supplied_it_custome_931159_idx_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='part',
            name='product',
            field=models.ForeignKey(
                blank=True,
                help_text='この部品が使用される製品（任意）',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='parts',
                to='products.product',
                verbose_name='製品'
            ),
        ),
    ]
