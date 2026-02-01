# api/manufacturing/models.py

from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal


class ManufacturingItem(models.Model):
    """制作品モデル"""

    class ProductionType(models.TextChoices):
        DOMESTIC = 'domestic', '国内生産'
        OVERSEAS = 'overseas', '海外生産'
        BOTH = 'both', '国内・海外両方'

    # 製品との関連（オプション）
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='manufacturing_items',
        verbose_name="製品",
        help_text="この制作品が紐づく製品"
    )

    # 基本情報
    manufacturing_number = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="品番",
        help_text="制作品を識別する品番"
    )
    manufacturing_name = models.CharField(
        max_length=200,
        verbose_name="制作品名"
    )

    # 生産タイプ（国内/海外）
    production_type = models.CharField(
        max_length=20,
        choices=ProductionType.choices,
        default=ProductionType.DOMESTIC,
        verbose_name="生産タイプ",
        help_text="国内生産または海外生産"
    )

    # 海外サプライヤー支店（海外生産の場合）
    overseas_supplier_branch = models.ForeignKey(
        'supplier.SupplierBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='overseas_manufacturing_items',
        verbose_name="海外サプライヤー支店",
        help_text="海外生産の場合のサプライヤー支店"
    )

    # 仕様情報
    specification = models.TextField(
        blank=True,
        verbose_name="仕様",
        help_text="制作品の詳細仕様"
    )
    unit = models.CharField(
        max_length=20,
        default="個",
        verbose_name="単位",
        help_text="単位（個、kg、m等）"
    )

    # 標準製造時間（時間単位）
    standard_production_time = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="標準製造時間（時間）",
        help_text="1個あたりの標準製造時間"
    )
     
    # 仕入れ単価（海外生産または国内・海外両方の場合）
    purchase_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="仕入れ単価",
        help_text="海外サプライヤーからの仕入れ単価（海外生産の場合）"
    )

    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="この制作品が現在使用可能かどうか"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_manufacturing_items',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "制作品"
        verbose_name_plural = "制作品一覧"
        ordering = ['manufacturing_number']
        db_table = "manufacturing_items"
        indexes = [
            models.Index(fields=['manufacturing_number']),
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['is_active']),
            models.Index(fields=['production_type']),
            models.Index(fields=['production_type', 'is_active']),
            models.Index(fields=['overseas_supplier_branch']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.manufacturing_number} - {self.manufacturing_name}"


class ProductionPlan(models.Model):
    """生産計画モデル（親）

    全体の製造計画を管理。
    複数のProductionScheduleに分割して製造を実施可能。
    """

    class PlanStatus(models.TextChoices):
        DRAFT = 'draft', '下書き'
        PLANNED = 'planned', '計画済み'
        IN_PROGRESS = 'in_progress', '製造中'
        COMPLETED = 'completed', '完了'
        CANCELLED = 'cancelled', 'キャンセル'
        ON_HOLD = 'on_hold', '保留'

    # 計画番号（自動生成）
    plan_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="計画番号",
        help_text="生産計画を識別する番号"
    )

    # 制作品
    manufacturing_item = models.ForeignKey(
        'ManufacturingItem',
        on_delete=models.PROTECT,
        related_name='production_plans',
        verbose_name="制作品"
    )

    # 製品（制作品経由でも取得可能だが、直接指定も可能）
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='production_plans',
        verbose_name="製品"
    )

    # 合計予定数量
    total_planned_quantity = models.PositiveIntegerField(
        verbose_name="合計予定数量",
        help_text="製造予定の総数量"
    )

    # 完成数量（実績）
    completed_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="完成数量",
        help_text="実際に完成した数量"
    )

    # 計画開始日
    planned_start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="計画開始日"
    )

    # 計画完了日
    planned_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="計画完了日"
    )

    # 実際の開始日
    actual_start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="実開始日"
    )

    # 実際の完了日
    actual_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="実完了日"
    )

    # ステータス
    status = models.CharField(
        max_length=20,
        choices=PlanStatus.choices,
        default=PlanStatus.DRAFT,
        verbose_name="ステータス"
    )

    # 優先度
    priority = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        verbose_name="優先度",
        help_text="1が最高優先度"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_production_plans',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "生産計画"
        verbose_name_plural = "生産計画一覧"
        ordering = ['priority', '-created_at']
        db_table = "production_plans"
        indexes = [
            models.Index(fields=['plan_number']),
            models.Index(fields=['manufacturing_item', 'status']),
            models.Index(fields=['product', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['planned_start_date']),
            models.Index(fields=['planned_end_date']),
            models.Index(fields=['priority']),
        ]

    def __str__(self):
        return f"{self.plan_number} - {self.manufacturing_item.manufacturing_name}"

    def save(self, *args, **kwargs):
        if not self.plan_number:
            # 計画番号を自動生成 (PP-YYYYMMDD-NNNN)
            today = timezone.now()
            prefix = f"PP-{today.strftime('%Y%m%d')}-"
            last_plan = ProductionPlan.objects.filter(
                plan_number__startswith=prefix
            ).order_by('-plan_number').first()

            if last_plan:
                last_num = int(last_plan.plan_number.split('-')[-1])
                self.plan_number = f"{prefix}{last_num + 1:04d}"
            else:
                self.plan_number = f"{prefix}0001"

        # 製品を制作品から自動設定
        if not self.product and self.manufacturing_item and self.manufacturing_item.product:
            self.product = self.manufacturing_item.product

        super().save(*args, **kwargs)

    @property
    def total_scheduled_quantity(self):
        """スケジュールの合計数量"""
        return self.schedules.aggregate(
            total=models.Sum('quantity')
        )['total'] or 0

    @property
    def remaining_quantity(self):
        """残り数量（予定 - 完成）"""
        return max(0, self.total_planned_quantity - self.completed_quantity)

    @property
    def completion_rate(self):
        """完成率（%）"""
        if self.total_planned_quantity == 0:
            return 0
        return round((self.completed_quantity / self.total_planned_quantity) * 100, 1)

    @property
    def schedule_count(self):
        """スケジュール数"""
        return self.schedules.count()


class ProductionSchedule(models.Model):
    """生産スケジュールモデル（子）

    ProductionPlanを分割して管理。
    例：3000個の製造を1500個ずつ2回に分けて実施
    """

    class ScheduleStatus(models.TextChoices):
        PLANNED = 'planned', '計画済み'
        IN_PROGRESS = 'in_progress', '製造中'
        COMPLETED = 'completed', '完了'
        CANCELLED = 'cancelled', 'キャンセル'

    # 親の生産計画
    plan = models.ForeignKey(
        'ProductionPlan',
        on_delete=models.CASCADE,
        related_name='schedules',
        verbose_name="生産計画"
    )

    # スケジュール番号（自動生成）
    schedule_number = models.CharField(
        max_length=50,
        verbose_name="スケジュール番号",
        help_text="スケジュールを識別する番号"
    )

    # 製造数量
    quantity = models.PositiveIntegerField(
        verbose_name="製造数量",
        help_text="このスケジュールで製造する数量"
    )

    # 完成数量（実績）
    completed_quantity = models.PositiveIntegerField(
        default=0,
        verbose_name="完成数量",
        help_text="実際に完成した数量"
    )

    # 制作開始日時
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="制作開始日時"
    )

    # 完成予定日時
    finished_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="完成予定日時"
    )

    # 実際の開始日時
    actual_started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="実開始日時"
    )

    # 実際の完了日時
    actual_finished_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="実完了日時"
    )

    # ステータス
    status = models.CharField(
        max_length=20,
        choices=ScheduleStatus.choices,
        default=ScheduleStatus.PLANNED,
        verbose_name="ステータス"
    )

    # 担当者
    assigned_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_schedules',
        verbose_name="担当者"
    )

    # 製造ライン（将来拡張用）
    production_line = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="製造ライン"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_production_schedules',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "生産スケジュール"
        verbose_name_plural = "生産スケジュール一覧"
        ordering = ['started_at', 'created_at']
        db_table = "production_schedules"
        indexes = [
            models.Index(fields=['plan']),
            models.Index(fields=['schedule_number']),
            models.Index(fields=['status']),
            models.Index(fields=['started_at']),
            models.Index(fields=['finished_at']),
            models.Index(fields=['assigned_to']),
        ]

    def __str__(self):
        return f"{self.schedule_number} - {self.quantity}個"

    def save(self, *args, **kwargs):
        if not self.schedule_number:
            # スケジュール番号を自動生成 (親計画番号-N)
            plan_schedules = ProductionSchedule.objects.filter(
                plan=self.plan
            ).count()
            self.schedule_number = f"{self.plan.plan_number}-{plan_schedules + 1:02d}"

        super().save(*args, **kwargs)

        # 親の計画のステータスを更新
        self._update_plan_status()

    def _update_plan_status(self):
        """親の生産計画のステータスを自動更新"""
        plan = self.plan
        schedules = plan.schedules.all()

        if not schedules.exists():
            return

        all_completed = all(s.status == 'completed' for s in schedules)
        any_in_progress = any(s.status == 'in_progress' for s in schedules)
        any_started = any(s.status in ['in_progress', 'completed'] for s in schedules)

        if all_completed:
            plan.status = 'completed'
            if not plan.actual_end_date:
                plan.actual_end_date = timezone.now().date()
        elif any_in_progress:
            plan.status = 'in_progress'
            if not plan.actual_start_date:
                plan.actual_start_date = timezone.now().date()
        elif any_started:
            plan.status = 'in_progress'

        # 完成数量を集計
        plan.completed_quantity = sum(s.completed_quantity for s in schedules)

        plan.save(update_fields=['status', 'completed_quantity', 'actual_start_date', 'actual_end_date', 'updated_at'])

    @property
    def completion_rate(self):
        """完成率（%）"""
        if self.quantity == 0:
            return 0
        return round((self.completed_quantity / self.quantity) * 100, 1)


class Material(models.Model):
    """材料モデル"""

    class MaterialCategory(models.TextChoices):
        RAW = 'raw', '原材料'
        SEMI_FINISHED = 'semi_finished', '半製品'
        COMPONENT = 'component', '部品'
        CONSUMABLE = 'consumable', '消耗品'
        OTHER = 'other', 'その他'

    # 基本情報
    material_code = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="品番",
        help_text="材料を識別する品番"
    )
    material_name = models.CharField(
        max_length=200,
        verbose_name="材料名"
    )

    # 形式・カテゴリ
    material_type = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="形式",
        help_text="材料の形式・規格"
    )
    category = models.CharField(
        max_length=20,
        choices=MaterialCategory.choices,
        default=MaterialCategory.RAW,
        verbose_name="カテゴリ"
    )

    # 仕様情報
    specification = models.TextField(
        blank=True,
        verbose_name="仕様",
        help_text="材料の詳細仕様"
    )
    unit = models.CharField(
        max_length=20,
        default="個",
        verbose_name="単位",
        help_text="在庫管理単位（個、kg、m等）"
    )

    # 在庫情報
    stock_quantity = models.IntegerField(
        default=0,
        verbose_name="在庫数量",
        help_text="現在の在庫数量"
    )
    minimum_stock = models.PositiveIntegerField(
        default=0,
        verbose_name="最小在庫数",
        help_text="在庫警告のしきい値"
    )
    maximum_stock = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="最大在庫数",
        help_text="最大在庫容量"
    )

    # 仕入先情報
    supplier_branch = models.ForeignKey(
        'supplier.SupplierBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='materials',
        verbose_name="仕入先支店"
    )

    # 価格情報
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="単価",
        help_text="参考単価"
    )

    # リードタイム
    lead_time_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="リードタイム（日）",
        help_text="標準納期日数"
    )

    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="この材料が現在使用可能かどうか"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_materials',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "材料"
        verbose_name_plural = "材料一覧"
        ordering = ['material_code']
        db_table = "materials"
        indexes = [
            models.Index(fields=['material_code']),
            models.Index(fields=['material_type']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['supplier_branch']),
            models.Index(fields=['stock_quantity']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.material_code} - {self.material_name}"

    @property
    def is_low_stock(self):
        """在庫が最小数量を下回っているか"""
        return self.stock_quantity <= self.minimum_stock

    @property
    def is_over_stock(self):
        """在庫が最大数量を超えているか"""
        if self.maximum_stock is None:
            return False
        return self.stock_quantity >= self.maximum_stock


class MaterialDeliverySchedule(models.Model):
    """材料納入予定モデル（将来拡張用）"""

    class DeliveryStatus(models.TextChoices):
        SCHEDULED = 'scheduled', '予定'
        ORDERED = 'ordered', '発注済み'
        IN_TRANSIT = 'in_transit', '輸送中'
        RECEIVED = 'received', '受入済み'
        CANCELLED = 'cancelled', 'キャンセル'

    # 材料
    material = models.ForeignKey(
        'Material',
        on_delete=models.CASCADE,
        related_name='delivery_schedules',
        verbose_name="材料"
    )

    # 納入予定数量
    quantity = models.PositiveIntegerField(
        verbose_name="納入予定数量"
    )

    # 納入予定日
    scheduled_date = models.DateField(
        verbose_name="納入予定日"
    )

    # 実際の納入日
    actual_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="実納入日"
    )

    # 実際の納入数量
    actual_quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="実納入数量"
    )

    # ステータス
    status = models.CharField(
        max_length=20,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.SCHEDULED,
        verbose_name="ステータス"
    )

    # 発注番号（外部システム連携用）
    order_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="発注番号",
        help_text="関連する発注番号"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_material_deliveries',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "材料納入予定"
        verbose_name_plural = "材料納入予定一覧"
        ordering = ['scheduled_date']
        db_table = "material_delivery_schedules"
        indexes = [
            models.Index(fields=['material']),
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['status']),
            models.Index(fields=['material', 'status']),
        ]

    def __str__(self):
        return f"{self.material.material_code} - {self.quantity}{self.material.unit} ({self.scheduled_date})"


class ManufacturingMaterial(models.Model):
    """制作品材料構成モデル（BOM: Bill of Materials）

    制作品を製造するために必要な材料の定義
    """

    # 制作品
    manufacturing_item = models.ForeignKey(
        'ManufacturingItem',
        on_delete=models.CASCADE,
        related_name='material_requirements',
        verbose_name="制作品"
    )

    # 材料
    material = models.ForeignKey(
        'Material',
        on_delete=models.CASCADE,
        related_name='manufacturing_usages',
        verbose_name="材料"
    )

    # 必要数量（制作品1個あたり）
    quantity_required = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        validators=[MinValueValidator(Decimal('0.0001'))],
        verbose_name="必要数量",
        help_text="制作品1個あたりに必要な材料の数量"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )

    class Meta:
        verbose_name = "制作品材料構成"
        verbose_name_plural = "制作品材料構成一覧"
        ordering = ['manufacturing_item', 'material']
        db_table = "manufacturing_materials"
        unique_together = [['manufacturing_item', 'material']]
        indexes = [
            models.Index(fields=['manufacturing_item']),
            models.Index(fields=['material']),
        ]

    def __str__(self):
        return f"{self.manufacturing_item.manufacturing_number} -> {self.material.material_code} ({self.quantity_required})"


class MaterialPriceHistory(models.Model):
    """材料価格履歴モデル"""

    # 関連
    material = models.ForeignKey(
        'Material',
        on_delete=models.CASCADE,
        related_name='material_price_histories',
        verbose_name="材料"
    )

    # 価格情報
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="単価",
        help_text="税抜単価"
    )

    # 有効期間
    start_date = models.DateField(
        verbose_name="開始日",
        help_text="この価格が有効になる日"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="終了日",
        help_text="この価格が無効になる日（空白の場合は無期限）"
    )

    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="この価格履歴が有効かどうか"
    )

    # 変更理由
    change_reason = models.TextField(
        blank=True,
        verbose_name="変更理由",
        help_text="価格変更の理由"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_material_price_histories',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "材料価格履歴"
        verbose_name_plural = "材料価格履歴一覧"
        ordering = ['-start_date', '-created_at']
        db_table = "material_price_histories"
        indexes = [
            models.Index(fields=['material']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['is_active']),
            models.Index(fields=['material', 'is_active']),
            models.Index(fields=['material', 'start_date']),
        ]

    def __str__(self):
        return f"{self.material.material_code} - ¥{self.price} ({self.start_date}〜)"

    def clean(self):
        """バリデーション"""
        super().clean()
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({
                'end_date': '終了日は開始日以降の日付を指定してください。'
            })

    @property
    def is_current(self):
        """現在有効な価格か"""
        today = timezone.now().date()
        is_started = self.start_date <= today
        is_not_ended = not self.end_date or self.end_date >= today
        return self.is_active and is_started and is_not_ended

    @property
    def is_future(self):
        """未来の価格か"""
        today = timezone.now().date()
        return self.is_active and self.start_date > today

    @property
    def is_expired(self):
        """期限切れの価格か"""
        if not self.end_date:
            return False
        today = timezone.now().date()
        return self.end_date < today


class ManufacturingItemPriceHistory(models.Model):
    """製造品価格履歴モデル"""

    # 関連
    manufacturing_item = models.ForeignKey(
        'ManufacturingItem',
        on_delete=models.CASCADE,
        related_name='manufacturing_item_price_histories',
        verbose_name="製造品"
    )

    # 価格情報
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="単価",
        help_text="税抜単価"
    )

    # 有効期間
    start_date = models.DateField(
        verbose_name="開始日",
        help_text="この価格が有効になる日"
    )
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="終了日",
        help_text="この価格が無効になる日（空白の場合は無期限）"
    )

    # ステータス
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="この価格履歴が有効かどうか"
    )

    # 変更理由
    change_reason = models.TextField(
        blank=True,
        verbose_name="変更理由",
        help_text="価格変更の理由"
    )

    # 備考
    notes = models.TextField(
        blank=True,
        verbose_name="備考"
    )

    # タイムスタンプ
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_manufacturing_item_price_histories',
        verbose_name="作成者"
    )

    class Meta:
        verbose_name = "製造品価格履歴"
        verbose_name_plural = "製造品価格履歴一覧"
        ordering = ['-start_date', '-created_at']
        db_table = "manufacturing_item_price_histories"
        indexes = [
            models.Index(fields=['manufacturing_item']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['is_active']),
            models.Index(fields=['manufacturing_item', 'is_active']),
            models.Index(fields=['manufacturing_item', 'start_date']),
        ]

    def __str__(self):
        return f"{self.manufacturing_item.manufacturing_number} - ¥{self.price} ({self.start_date}〜)"

    def clean(self):
        """バリデーション"""
        super().clean()
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({
                'end_date': '終了日は開始日以降の日付を指定してください。'
            })

    @property
    def is_current(self):
        """現在有効な価格か"""
        today = timezone.now().date()
        is_started = self.start_date <= today
        is_not_ended = not self.end_date or self.end_date >= today
        return self.is_active and is_started and is_not_ended

    @property
    def is_future(self):
        """未来の価格か"""
        today = timezone.now().date()
        return self.is_active and self.start_date > today

    @property
    def is_expired(self):
        """期限切れの価格か"""
        if not self.end_date:
            return False
        today = timezone.now().date()
        return self.end_date < today
