/**
 * Date calculation and validation utilities for Walmart Inbound & 10-Day Case rules
 */

export function getTodayString(simulatedDate?: string): string {
  if (simulatedDate && isValidDate(simulatedDate)) {
    return simulatedDate;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDate(dateStr?: string | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  if (!isValidDate(dateStr)) return '';
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export const addDaysToDate = addDays;

export function diffInDays(dateStr1: string, dateStr2: string): number {
  if (!isValidDate(dateStr1) || !isValidDate(dateStr2)) return 0;
  const d1 = parseDate(dateStr1);
  const d2 = parseDate(dateStr2);
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

export function calculateDaysDifference(startDate: string, endDate: string): number {
  return diffInDays(endDate, startDate);
}

/**
 * Calculates Case eligible date: Arrival Date + threshold (10 days)
 */
export function getCaseEligibleDate(arrivalDate?: string, thresholdDays: number = 10): string | undefined {
  if (!arrivalDate || !isValidDate(arrivalDate)) return undefined;
  return addDays(arrivalDate, thresholdDays);
}

/**
 * Days since arrival: Today - Arrival Date
 */
export function getDaysSinceArrival(arrivalDate?: string, todayStr?: string): number | undefined {
  if (!arrivalDate || !isValidDate(arrivalDate)) return undefined;
  const today = todayStr || getTodayString();
  return diffInDays(today, arrivalDate);
}

/**
 * Days until Case eligible: Case Eligible Date - Today
 * > 0: Still Y days to go
 * === 0: Exactly today reached
 * < 0: Overdue by |X| days
 */
export function getDaysUntilCase(arrivalDate?: string, todayStr?: string, thresholdDays: number = 10): number | undefined {
  if (!arrivalDate || !isValidDate(arrivalDate)) return undefined;
  const eligibleDate = getCaseEligibleDate(arrivalDate, thresholdDays);
  if (!eligibleDate) return undefined;
  const today = todayStr || getTodayString();
  return diffInDays(eligibleDate, today);
}

/**
 * Human-readable prompt status string
 */
export function getCaseTimeDisplay(arrivalDate?: string, todayStr?: string, thresholdDays: number = 10): {
  text: string;
  badgeClass: string;
  statusType: 'no_arrival' | 'approaching' | 'eligible' | 'overdue' | 'observing';
  daysSince?: number;
  daysRemaining?: number;
  overdueDays?: number;
} {
  if (!arrivalDate || !isValidDate(arrivalDate)) {
    return {
      text: '暂无实际到仓日期 (无法计算Case)',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
      statusType: 'no_arrival',
    };
  }

  const daysSince = getDaysSinceArrival(arrivalDate, todayStr) ?? 0;
  const daysUntil = getDaysUntilCase(arrivalDate, todayStr, thresholdDays) ?? 0;

  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil);
    return {
      text: `已超期 ${overdue} 天未开Case (已到仓 ${daysSince} 天)`,
      badgeClass: 'bg-red-50 text-red-700 border-red-200 font-medium animate-pulse',
      statusType: 'overdue',
      daysSince,
      overdueDays: overdue,
    };
  } else if (daysUntil === 0) {
    return {
      text: `今日达到 10 天 Case 条件 (已到仓 ${daysSince} 天)`,
      badgeClass: 'bg-red-50 text-red-700 border-red-300 font-medium',
      statusType: 'eligible',
      daysSince,
      daysRemaining: 0,
    };
  } else if (daysUntil <= 3) {
    return {
      text: `还需 ${daysUntil} 天达到Case条件 (已到仓 ${daysSince} 天)`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 font-medium',
      statusType: 'approaching',
      daysSince,
      daysRemaining: daysUntil,
    };
  } else {
    return {
      text: `已到仓 ${daysSince} 天 (还需 ${daysUntil} 天)`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      statusType: 'observing',
      daysSince,
      daysRemaining: daysUntil,
    };
  }
}

/**
 * Checks for date logic anomalies
 */
export function checkDateAnomalies(shipDate?: string, arrivalDate?: string, receivedDate?: string): string[] {
  const errors: string[] = [];
  if (shipDate && arrivalDate && isValidDate(shipDate) && isValidDate(arrivalDate)) {
    if (diffInDays(arrivalDate, shipDate) < 0) {
      errors.push(`到仓日期 (${arrivalDate}) 早于发货日期 (${shipDate})，存在日期逻辑错误`);
    }
  }
  if (arrivalDate && receivedDate && isValidDate(arrivalDate) && isValidDate(receivedDate)) {
    if (diffInDays(receivedDate, arrivalDate) < 0) {
      errors.push(`接收日期 (${receivedDate}) 早于实际到仓日期 (${arrivalDate})，请核对报表`);
    }
  }
  return errors;
}
