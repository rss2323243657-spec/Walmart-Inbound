import {
  FreightShippingItem,
  ShipmentFreightSummary,
  MonthlyFreightSummary,
  FreightReconciliationStatus,
} from '../types';

/**
 * Parses dimension string into length, width, height in cm.
 * Examples: "43*25*37", "43x25x37", "43*25*37cm", "43, 25, 37", "43 25 37"
 */
export function parseDimensions(dimStr: string | number): {
  length: number;
  width: number;
  height: number;
  text: string;
} {
  if (typeof dimStr === 'number') {
    return { length: dimStr, width: 1, height: 1, text: `${dimStr}*1*1` };
  }

  const clean = String(dimStr || '')
    .trim()
    .replace(/[cCmMsS]/g, '')
    .replace(/[xX×,，/]/g, '*');

  const parts = clean
    .split('*')
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !isNaN(n) && n > 0);

  if (parts.length >= 3) {
    return {
      length: parts[0],
      width: parts[1],
      height: parts[2],
      text: `${parts[0]}*${parts[1]}*${parts[2]}`,
    };
  } else if (parts.length === 1) {
    return {
      length: parts[0],
      width: 1,
      height: 1,
      text: `${parts[0]}*1*1`,
    };
  }

  // Default fallback dimensions
  return { length: 40, width: 30, height: 25, text: '40*30*25' };
}

/**
 * Extracts month key "YYYY-MM" from date string "YYYY-MM-DD" or "YYYY/M/D"
 */
export function extractMonthKey(dateStr: string): string {
  if (!dateStr) return '2026-08';
  const clean = dateStr.trim().replace(/\//g, '-');
  const parts = clean.split('-');
  if (parts.length >= 2) {
    let year = parts[0].padStart(4, '20');
    if (year.length === 2) year = `20${year}`;
    const month = parts[1].padStart(2, '0');
    return `${year}-${month}`;
  }
  return '2026-08';
}

/**
 * Formats "YYYY-MM" into readable Chinese display "YYYY年MM月"
 */
export function formatMonthDisplay(monthKey: string): string {
  if (!monthKey || monthKey === 'all') return '全部月份汇总';
  const parts = monthKey.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}年${parts[1]}月`;
  }
  return monthKey;
}

/**
 * Calculate single item metrics (volumetric weight, chargeable weight, min weight rule)
 */
export function calculateItemFreightMetrics(
  item: Partial<FreightShippingItem>
): FreightShippingItem {
  const dims = parseDimensions(
    item.dimensionsText || `${item.boxLength || 40}*${item.boxWidth || 30}*${item.boxHeight || 25}`
  );
  const length = item.boxLength || dims.length;
  const width = item.boxWidth || dims.width;
  const height = item.boxHeight || dims.height;
  const dimensionsText = item.dimensionsText || dims.text;

  const boxWeight = Number(item.boxWeight || 0);
  const boxCount = Math.max(1, Number(item.boxCount || 1));
  const unitPrice = Number(item.unitPrice || 0);
  const actualQty = Number(item.actualQty || 0);
  const shipDate = item.shipDate || '2026-08-01';
  const monthKey = item.monthKey || extractMonthKey(shipDate);

  // 1. Volumetric weight = (L * W * H) / 6000
  const volumetricWeight = Number(((length * width * height) / 6000).toFixed(2));

  // 2. Chargeable weight = Max(Actual Weight, Volumetric Weight)
  const baseWeight = Math.max(boxWeight, volumetricWeight);
  const pricingMethod: 'Weight' | 'Volume' = volumetricWeight > boxWeight ? 'Volume' : 'Weight';

  // 3. Minimum 12kg rule: Whichever method, if < 12kg, calculate as 12kg
  const minWeightApplied = baseWeight < 12;
  const billedWeightPerBox = Number(Math.max(12, baseWeight).toFixed(2));

  let chargeableType: 'MIN_12KG' | 'VOLUMETRIC' | 'ACTUAL_WEIGHT' = 'ACTUAL_WEIGHT';
  if (minWeightApplied) {
    chargeableType = 'MIN_12KG';
  } else if (pricingMethod === 'Volume') {
    chargeableType = 'VOLUMETRIC';
  }

  const totalChargeableWeight = Number((billedWeightPerBox * boxCount).toFixed(2));

  // 4. Estimated Freight for this item
  const estimatedItemFreight = Number((unitPrice * totalChargeableWeight).toFixed(2));

  return {
    id: item.id || `F-ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    shipmentId: item.shipmentId || 'UNKNOWN_SHIPMENT',
    warehouse: (item.warehouse || 'PHX1').toUpperCase(),
    shipDate,
    monthKey,
    sku: item.sku || 'SKU-UNKNOWN',
    productName: item.productName || item.sku || '产品名称',
    actualQty,
    boxCount,
    boxWeight,
    boxLength: length,
    boxWidth: width,
    boxHeight: height,
    dimensionsText,
    channel: item.channel || '美森限时达',
    unitPrice,
    isMergedCustoms: item.isMergedCustoms !== false,
    mixedBoxGroup: item.mixedBoxGroup?.trim() || undefined,
    notes: item.notes,
    volumetricWeight,
    volumetricWeightPerBox: volumetricWeight,
    billedWeightPerBox,
    chargeableWeightPerBox: billedWeightPerBox,
    totalChargeableWeight,
    pricingMethod,
    chargeableType,
    minWeightApplied,
    estimatedItemFreight,
  };
}

/**
 * Group freight items by Shipment ID
 */
export function groupFreightItemsByShipment(
  items: FreightShippingItem[]
): Map<string, FreightShippingItem[]> {
  const map = new Map<string, FreightShippingItem[]>();
  items.forEach((item) => {
    const sid = (item.shipmentId || 'UNKNOWN').trim().toUpperCase();
    const list = map.get(sid) || [];
    list.push(item);
    map.set(sid, list);
  });
  return map;
}

/**
 * Calculates shipment-level freight summary with mixed-box deduplication and customs fee
 */
export function calculateShipmentFreightSummary(
  shipmentId: string,
  rawItems: FreightShippingItem[],
  existingActuals?: {
    actualChargeableWeight?: number;
    actualCost?: number;
    actualUnitPrice?: number;
    actualCustomsFee?: number;
    reconciliationNotes?: string;
    isSyncedToShipments?: boolean;
  }
): ShipmentFreightSummary {
  // Ensure all items have calculated metrics
  const items = rawItems.map((it) => calculateItemFreightMetrics(it));

  if (items.length === 0) {
    return {
      shipmentId,
      warehouse: 'PHX1',
      shipDate: '2026-08-01',
      monthKey: '2026-08',
      channel: '美森限时达',
      unitPrice: 0,
      isMergedCustoms: true,
      totalActualQty: 0,
      totalUnits: 0,
      totalCartons: 0,
      totalActualWeight: 0,
      totalVolumetricWeight: 0,
      estimatedTotalChargeableWeight: 0,
      totalEstimatedChargeableWeight: 0,
      estimatedFreightFee: 0,
      estimatedFreightCost: 0,
      customsFee: 175,
      estimatedTotalCost: 175,
      totalEstimatedCost: 175,
      reconciliationStatus: 'Pending',
      isReconciled: false,
      appliedMinimumRule: false,
      items: [],
      isSyncedToShipments: false,
    };
  }

  const first = items[0];
  const warehouse = first.warehouse;
  const shipDate = first.shipDate;
  const monthKey = first.monthKey || extractMonthKey(shipDate);
  const channel = first.channel;
  const unitPrice = first.unitPrice;
  const isMergedCustoms = first.isMergedCustoms;

  const totalActualQty = items.reduce((sum, item) => sum + (item.actualQty || 0), 0);

  // Mixed Box Deduplication Logic:
  // Items with the same mixedBoxGroup share the physical carton.
  const mixedGroups = new Map<string, FreightShippingItem[]>();
  const standaloneItems: FreightShippingItem[] = [];

  items.forEach((item) => {
    if (item.mixedBoxGroup) {
      const groupKey = item.mixedBoxGroup.trim();
      const existing = mixedGroups.get(groupKey) || [];
      existing.push(item);
      mixedGroups.set(groupKey, existing);
    } else {
      standaloneItems.push(item);
    }
  });

  let estimatedTotalChargeableWeight = 0;
  let estimatedFreightFee = 0;
  let totalCartons = 0;
  let totalActualWeight = 0;
  let totalVolumetricWeight = 0;
  let appliedMinimumRule = false;

  // Add standalone boxes
  standaloneItems.forEach((item) => {
    const boxChargeWeight = item.chargeableWeightPerBox * item.boxCount;
    estimatedTotalChargeableWeight += boxChargeWeight;
    estimatedFreightFee += item.unitPrice * boxChargeWeight;
    totalCartons += item.boxCount;
    totalActualWeight += item.boxWeight * item.boxCount;
    totalVolumetricWeight += item.volumetricWeightPerBox * item.boxCount;
    if (item.minWeightApplied) appliedMinimumRule = true;
  });

  // Add mixed box groups (Counted ONLY ONCE per physical mixed group)
  mixedGroups.forEach((groupItems) => {
    const rep = groupItems[0];
    const boxChargeWeight = rep.chargeableWeightPerBox * rep.boxCount;
    estimatedTotalChargeableWeight += boxChargeWeight;
    estimatedFreightFee += rep.unitPrice * boxChargeWeight;
    totalCartons += rep.boxCount;
    totalActualWeight += rep.boxWeight * rep.boxCount;
    totalVolumetricWeight += rep.volumetricWeightPerBox * rep.boxCount;
    if (rep.minWeightApplied) appliedMinimumRule = true;
  });

  estimatedTotalChargeableWeight = Number(estimatedTotalChargeableWeight.toFixed(2));
  estimatedFreightFee = Number(estimatedFreightFee.toFixed(2));
  totalActualWeight = Number(totalActualWeight.toFixed(2));
  totalVolumetricWeight = Number(totalVolumetricWeight.toFixed(2));

  // Customs Fee: Merged = 175, Standalone = 350
  const customsFee = isMergedCustoms ? 175 : 350;
  const estimatedTotalCost = Number((estimatedFreightFee + customsFee).toFixed(2));

  // Actual Reconciliation calculations
  const actualChargeableWeight = existingActuals?.actualChargeableWeight;
  const actualCost = existingActuals?.actualCost;
  const actualUnitPrice = existingActuals?.actualUnitPrice;
  const actualCustomsFee = existingActuals?.actualCustomsFee;
  const reconciliationNotes = existingActuals?.reconciliationNotes;
  const isSyncedToShipments = existingActuals?.isSyncedToShipments || false;

  let reconciliationStatus: FreightReconciliationStatus = 'Pending';
  let weightDiff: number | undefined;
  let weightDiffPercent: number | undefined;
  let costDiff: number | undefined;
  let costDiffPercent: number | undefined;
  const isReconciled = actualCost !== undefined && actualCost !== null && actualCost > 0;

  if (isReconciled && actualCost !== undefined) {
    costDiff = Number((actualCost - estimatedTotalCost).toFixed(2));
    costDiffPercent = Number(((costDiff / (estimatedTotalCost || 1)) * 100).toFixed(1));

    if (Math.abs(costDiff) <= 10) {
      reconciliationStatus = 'Matched';
    } else if (costDiff > 10) {
      reconciliationStatus = 'OverBudget';
    } else {
      reconciliationStatus = 'CostSaving';
    }
  }

  if (
    actualChargeableWeight !== undefined &&
    actualChargeableWeight !== null &&
    actualChargeableWeight > 0
  ) {
    weightDiff = Number((actualChargeableWeight - estimatedTotalChargeableWeight).toFixed(2));
    weightDiffPercent = Number(
      ((weightDiff / (estimatedTotalChargeableWeight || 1)) * 100).toFixed(1)
    );
  }

  return {
    shipmentId,
    warehouse,
    shipDate,
    monthKey,
    channel,
    unitPrice,
    isMergedCustoms,
    totalActualQty,
    totalUnits: totalActualQty,
    totalCartons,
    totalActualWeight,
    totalVolumetricWeight,
    estimatedTotalChargeableWeight,
    totalEstimatedChargeableWeight: estimatedTotalChargeableWeight,
    estimatedFreightFee,
    estimatedFreightCost: estimatedFreightFee,
    customsFee,
    estimatedTotalCost,
    totalEstimatedCost: estimatedTotalCost,
    actualChargeableWeight,
    actualCost,
    actualUnitPrice,
    actualCustomsFee,
    reconciliationStatus,
    isReconciled,
    appliedMinimumRule,
    weightDiff,
    weightDifference: weightDiff,
    weightDiffPercent,
    costDiff,
    costDifference: costDiff,
    costDiffPercent,
    costDifferencePercent: costDiffPercent,
    reconciliationNotes,
    items,
    isSyncedToShipments,
  };
}

/**
 * Aggregates freight items and actuals into monthly overviews
 */
export function aggregateMonthlySummaries(
  itemsOrShipments: FreightShippingItem[] | ShipmentFreightSummary[],
  actualsRecord?: Record<
    string,
    {
      actualChargeableWeight?: number;
      actualCost?: number;
      actualUnitPrice?: number;
      actualCustomsFee?: number;
      reconciliationNotes?: string;
      isSyncedToShipments?: boolean;
    }
  >
): MonthlyFreightSummary[] {
  let shipmentSummaries: ShipmentFreightSummary[] = [];

  if (itemsOrShipments.length > 0 && 'items' in itemsOrShipments[0]) {
    // Already ShipmentFreightSummary[]
    shipmentSummaries = itemsOrShipments as ShipmentFreightSummary[];
  } else {
    // List of FreightShippingItem[]
    const items = itemsOrShipments as FreightShippingItem[];
    const grouped = groupFreightItemsByShipment(items);
    grouped.forEach((shipmentItems, shipmentId) => {
      const actuals = actualsRecord ? actualsRecord[shipmentId] : undefined;
      const summary = calculateShipmentFreightSummary(shipmentId, shipmentItems, actuals);
      shipmentSummaries.push(summary);
    });
  }

  const monthMap = new Map<string, ShipmentFreightSummary[]>();

  shipmentSummaries.forEach((s) => {
    const list = monthMap.get(s.monthKey) || [];
    list.push(s);
    monthMap.set(s.monthKey, list);
  });

  const results: MonthlyFreightSummary[] = [];

  monthMap.forEach((list, monthKey) => {
    const shipmentCount = list.length;
    const totalActualQty = list.reduce((sum, s) => sum + s.totalActualQty, 0);
    const totalCartons = list.reduce((sum, s) => sum + s.totalCartons, 0);
    const estimatedTotalChargeableWeight = Number(
      list.reduce((sum, s) => sum + s.totalEstimatedChargeableWeight, 0).toFixed(2)
    );
    const estimatedFreightFee = Number(
      list.reduce((sum, s) => sum + s.estimatedFreightFee, 0).toFixed(2)
    );
    const estimatedCustomsFee = Number(
      list.reduce((sum, s) => sum + s.customsFee, 0).toFixed(2)
    );
    const estimatedTotalCost = Number(
      list.reduce((sum, s) => sum + s.totalEstimatedCost, 0).toFixed(2)
    );

    const actualTotalChargeableWeight = Number(
      list
        .filter((s) => s.actualChargeableWeight !== undefined && s.actualChargeableWeight > 0)
        .reduce((sum, s) => sum + (s.actualChargeableWeight || 0), 0)
        .toFixed(2)
    );

    const actualTotalCost = Number(
      list
        .filter((s) => s.actualCost !== undefined && s.actualCost > 0)
        .reduce((sum, s) => sum + (s.actualCost || 0), 0)
        .toFixed(2)
    );

    const totalCostDiff = Number(
      list
        .filter((s) => s.costDiff !== undefined)
        .reduce((sum, s) => sum + (s.costDiff || 0), 0)
        .toFixed(2)
    );

    const totalCostDiffPercent =
      estimatedTotalCost > 0 ? (totalCostDiff / estimatedTotalCost) * 100 : 0;

    const reconciledShipmentCount = list.filter(
      (s) => s.actualCost !== undefined && s.actualCost > 0
    ).length;
    const pendingReconciliationCount = shipmentCount - reconciledShipmentCount;

    results.push({
      monthKey,
      monthDisplay: formatMonthDisplay(monthKey),
      shipments: list,
      shipmentCount,
      totalUnits: totalActualQty,
      totalActualQty,
      totalCartons,
      estimatedTotalChargeableWeight,
      totalEstimatedChargeableWeight: estimatedTotalChargeableWeight,
      estimatedFreightFee,
      estimatedFreightCost: estimatedFreightFee,
      customsFee: estimatedCustomsFee,
      estimatedCustomsFee,
      estimatedTotalCost,
      totalEstimatedCost: estimatedTotalCost,
      actualTotalChargeableWeight,
      totalActualChargeableWeight: actualTotalChargeableWeight,
      actualTotalCost,
      totalActualCost: actualTotalCost,
      totalCostDiff,
      costDifference: totalCostDiff,
      costDifferencePercent: Number(totalCostDiffPercent.toFixed(1)),
      reconciledShipmentCount,
      unreconciledShipmentCount: pendingReconciliationCount,
      pendingReconciliationCount,
    });
  });

  // Sort months descending (e.g. 2026-08 before 2026-07)
  return results.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
