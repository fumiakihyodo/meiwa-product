# Generated manually for currency and notes fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supplier", "0003_alter_suppliercontact_name_kana_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="currency",
            field=models.CharField(
                choices=[
                    ("JPY", "日本円 (¥)"),
                    ("USD", "米ドル ($)"),
                    ("EUR", "ユーロ (€)"),
                    ("CNY", "中国元 (¥)"),
                    ("KRW", "韓国ウォン (₩)"),
                    ("TWD", "台湾ドル (NT$)"),
                    ("THB", "タイバーツ (฿)"),
                    ("VND", "ベトナムドン (₫)"),
                ],
                default="JPY",
                help_text="このサプライヤーとの取引で使用する通貨",
                max_length=3,
                verbose_name="取引通貨",
            ),
        ),
        migrations.AddField(
            model_name="supplier",
            name="notes",
            field=models.TextField(blank=True, null=True, verbose_name="備考"),
        ),
    ]
