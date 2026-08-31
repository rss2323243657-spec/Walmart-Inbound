export type ShipmentStatus =
  | 'Draft'
  | 'Shipped'
  | 'In Transit'
  | 'Arrived'
  | 'Receiving'
  | 'Partially Received'
  | 'Fully Received'
  | 'Discrepancy'
  | 'Case Eligible'
  | 'Case Opened'
  | 'Case Processing'
  | 'Resolved'
  | 'Closed';

export type CaseStatus =
  | 'Not Eligible'
  | 'Eligible'
  | 'Pending'
  | 'Opened'
  | 'In Review'
  | 'Partially Resolved'
  | 'Resolved'
  | 'Rejected'
  | 'Closed';

export type AnomalyLevel = 'critical' | 'warning' | 'info';

export type ChangeType =
  | '销售出库'
  | 'Walmart接收'
  | '货件发出'
  | '库存调整'
  | '退货'
  | '损耗'
  | '人工调整'
  | '导入更新'
  | '其他';

export interface Product {
  sku: string;
  itemId?: string;
  gtin?: string;
  productName: string;
  productType?: string;
  safetyStock?: number;
  minStock?: number;
  maxStock?: number;
  targetStock?: number;
  recent30DaysSales?: number;
}

export type DiscrepancyTag =
  | 'FC_SHORTAGE'
  | 'DAMAGED_CARTON'
  | 'LABEL_ISSUE'
  | 'SUPPLIER_MISCOUNT'
  | 'PENDING_INVESTIGATION'
  | 'VERIFIED'
  | 'OTHER';

export interface ShipmentItem {
  shipmentId: string;
  sku: string;
  itemId?: string;
  gtin?: string;
  productName: string;
  productType?: string;
  shipQty: number;
  cartons: number;
  qtyPerCarton: number;
  receivedQty: number;
  receivedCartons?: number;
  discrepancyQty: number; // shipQty - receivedQty
  receivedDate?: string;
  source?: string;
  discrepancyReason?: string; // 差异原因与处理备注
  discrepancyTag?: DiscrepancyTag | string; // 差异类型标签
  requiresFollowup?: boolean; // 是否设置重点跟进/提醒
  isReconciled?: boolean; // 是否已完成核对
}

export interface Shipment {
  id: string; // Shipment ID (e.g. WMT-SHP-20260801-01)
  shipmentName: string;
  shipDate: string; // YYYY-MM-DD
  eta?: string; // YYYY-MM-DD
  arrivalDate?: string; // YYYY-MM-DD (Actual arrival)
  fc: string; // Walmart Fulfillment Center (e.g., PHX1, IND1)
  tracking?: string;
  carrier?: string;
  status: ShipmentStatus;
  items: ShipmentItem[];
  
  // Aggregate / Primary fields
  totalShipQty: number;
  totalReceivedQty: number;
  totalDiscrepancyQty: number;
  totalCartons: number;
  totalReceivedCartons: number;
  missingCartons: number;
  
  // Case info
  caseId?: string;
  caseStatus: CaseStatus;
  caseEligibleDate?: string; // arrivalDate + 10 days
  daysSinceArrival?: number;
  daysUntilCase?: number;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
  source: 'Manual' | 'Walmart Shipment Report' | 'Walmart Receiving Report' | 'API' | 'Demo Data' | string;
}

export interface InventoryItem {
  sku: string;
  itemId?: string;
  gtin?: string;
  productName: string;
  productType?: string;
  available: number;
  reserved: number;
  inbound: number;
  receiving: number;
  totalProjected: number; // available + inbound + receiving
  safetyStock: number;
  minStock?: number;
  maxStock?: number;
  targetStock?: number;
  sales30Days?: number;
  dailyAvgSales?: number;
  daysOfSupply?: number;
  lastUpdated: string;
  source: string;
  updatedAt?: string;
}

export interface InventoryLedgerEntry {
  id: string;
  date: string;
  sku: string;
  productName?: string;
  beforeQty: number;
  changeQty: number;
  afterQty: number;
  changeType: ChangeType | string;
  source: string;
  reference: string; // Shipment ID or Report Name or Order ID
  notes?: string;
  timestamp: string;
}

export interface CaseRecord {
  id: string; // Case ID (e.g. WMT-CASE-98421)
  shipmentId: string;
  sku: string;
  itemId?: string;
  productName: string;
  discrepancyQty: number;
  shipQty: number;
  receivedQty: number;
  arrivalDate: string;
  eligibleDate: string;
  caseOpenDate?: string;
  status: CaseStatus;
  walmartResponse?: string;
  resolutionQty?: number;
  finalDifference?: number;
  closedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  targetType: 'Shipment' | 'Inventory' | 'Case' | 'Product' | 'Import' | 'Data Import' | string;
  targetId: string;
  action?: string;
  field?: string;
  beforeValue?: string | number | null;
  afterValue?: string | number | null;
  source?: string;
  operator?: string;
  details?: string;
}

export interface AnomalyItem {
  id: string;
  level: AnomalyLevel;
  type: string;
  title?: string;
  message?: string;
  description?: string;
  shipmentId: string;
  referenceId?: string;
  referenceType?: 'Shipment' | 'SKU' | 'Date' | 'Case';
  detectedAt?: string;
  data?: any;
}

export interface AppSettings {
  caseRuleDays?: number;
  caseEligibilityDays?: number;
  approachingAlertDays?: number;
  approachingDaysWarning?: number;
  autoStatusCalculation?: boolean;
  autoCalculateCase?: boolean;
  autoCloseCaseOnReceipt?: boolean;
  allowNegativeInventory?: boolean;
  strictArrivalDateRequired?: boolean;
  customTodayDate?: string;
  currentSimulatedDate?: string;
}

export type SystemSettings = AppSettings;

export interface ImportPreviewResult {
  reportType: string;
  rawHeaders: string[];
  columnMapping: Record<string, string>;
  totalRows: number;
  newShipments: Shipment[];
  updatedShipments: Shipment[];
  updatedInventory: InventoryItem[];
  anomalies: { type: string; message: string; row: number }[];
}

export interface FreightShippingItem {
  id: string;
  shipmentId: string;
  warehouse: string;
  shipDate: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  sku: string;
  productName: string;
  actualQty: number;
  boxCount: number;
  boxWeight: number; // 单箱实重 (kg)
  boxLength: number; // 长 (cm)
  boxWidth: number; // 宽 (cm)
  boxHeight: number; // 高 (cm)
  dimensionsText: string; // e.g. "43*25*37"
  channel: string; // e.g. "美森限时达", "以星快船", "普船超大件", "空运专线"
  unitPrice: number; // 单价 (元/kg)
  isMergedCustoms: boolean; // 是否合并报关 (true: ¥175, false: ¥350)
  mixedBoxGroup?: string; // 混箱标识 (如 "MIX-01", 相同标识共用箱规和箱数，去重只计一次运费)
  notes?: string;

  // Calculated fields
  volumetricWeight: number; // (L * W * H) / 6000
  volumetricWeightPerBox: number;
  billedWeightPerBox: number; // Math.max(12, Math.max(boxWeight, volumetricWeight))
  chargeableWeightPerBox: number;
  totalChargeableWeight: number;
  pricingMethod: 'Weight' | 'Volume'; // 实重计费 / 体积重计费
  chargeableType: 'MIN_12KG' | 'VOLUMETRIC' | 'ACTUAL_WEIGHT';
  minWeightApplied: boolean; // 是否触发不足12kg按12kg计费
  estimatedItemFreight: number; // 单品项预估运费
}

export type FreightReconciliationStatus = 'Pending' | 'Matched' | 'OverBudget' | 'CostSaving';

export interface ShipmentFreightSummary {
  shipmentId: string;
  warehouse: string;
  shipDate: string;
  monthKey: string;
  channel: string;
  unitPrice: number;
  isMergedCustoms: boolean;
  totalActualQty: number;
  totalUnits: number;
  totalCartons: number; // 混箱去重后的实际总箱数
  totalActualWeight: number;
  totalVolumetricWeight: number;

  // Estimated Calculations
  estimatedTotalChargeableWeight: number;
  totalEstimatedChargeableWeight: number;
  estimatedFreightFee: number;
  estimatedFreightCost: number;
  customsFee: number; // 报关费 (合并:175, 独立:350)
  estimatedTotalCost: number;
  totalEstimatedCost: number;

  // Actual Reconciliation
  actualChargeableWeight?: number; // 实际收费重 (kg)
  actualCost?: number; // 实际总费用 (¥)
  actualUnitPrice?: number; // 实际单价 (元/kg)
  actualCustomsFee?: number; // 实际报关费 (¥)
  reconciliationStatus: FreightReconciliationStatus;
  isReconciled: boolean;
  appliedMinimumRule: boolean;
  weightDiff?: number; // 实际收费重 - 预估计费重
  weightDifference?: number;
  weightDiffPercent?: number;
  costDiff?: number; // 实际费用 - 预估费用
  costDifference?: number;
  costDiffPercent?: number;
  costDifferencePercent?: number;
  reconciliationNotes?: string;

  items: FreightShippingItem[];
  isSyncedToShipments?: boolean; // 是否已确认反向提取同步至货件管理
}

export interface MonthlyFreightSummary {
  monthKey: string;
  monthDisplay: string;
  shipments: ShipmentFreightSummary[];
  shipmentCount: number;
  totalUnits: number;
  totalActualQty: number;
  totalCartons: number;
  estimatedTotalChargeableWeight: number;
  totalEstimatedChargeableWeight: number;
  estimatedFreightFee: number;
  estimatedFreightCost: number;
  customsFee: number;
  estimatedCustomsFee: number;
  estimatedTotalCost: number;
  totalEstimatedCost: number;
  actualTotalChargeableWeight: number;
  totalActualChargeableWeight: number;
  actualTotalCost: number;
  totalActualCost: number;
  totalCostDiff: number;
  costDifference: number;
  costDifferencePercent: number;
  reconciledShipmentCount: number;
  unreconciledShipmentCount: number;
  pendingReconciliationCount: number;
}

