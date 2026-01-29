# Generated migration for adding overseas_supplier_branch field

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('supplier', '0001_initial'),
        ('manufacturing', '0004_alter_manufacturingitem_production_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='manufacturingitem',
            name='overseas_supplier_branch',
            field=models.ForeignKey(
                blank=True,
                help_text='海外生産の場合のサプライヤー支店',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='overseas_manufacturing_items',
                to='supplier.supplierbranch',
                verbose_name='海外サプライヤー支店'
            ),
        ),
        migrations.AddIndex(
            model_name='manufacturingitem',
            index=models.Index(
                fields=['overseas_supplier_branch'],
                name='manufacturing_overseas_idx'
            ),
        ),
    ]
