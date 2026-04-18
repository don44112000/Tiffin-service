import { requestQueue } from './queueManager';
import type {
  DashboardResponse,
  AllUsersResponse,
  OrdersByDateSlotResponse,
  NegativeCreditsResponse,
  MonthlyReportResponse,
  CreditHistoryResponse,
  MenuResponse,
  MarkDeliveredResponse,
  RechargeResponse,
  ReconcileResponse,
  UpsertMenuResponse,
  ReduceCreditsResponse,
  GenericResponse,
} from '../types';

const BASE_URL = '/api/proxy';

async function apiGet<T>(
  action: string,
  params: Record<string, string> = {},
  options?: { silent?: boolean }
): Promise<T> {
  return requestQueue.add(async () => {
    const query = new URLSearchParams({ action, ...params });
    const res = await fetch(`${BASE_URL}?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Request failed');
    return data as T;
  }, options);
}

async function apiPost<T>(
  action: string,
  body: Record<string, unknown> = {},
  options?: { silent?: boolean }
): Promise<T> {
  return requestQueue.add(async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Request failed');
    return data as T;
  }, options);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function normalizeDate(dateStr: string): string {
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(dateStr);
}

function normalizeOrderDates<T extends { date?: string }>(obj: T): T {
  if (obj.date) return { ...obj, date: normalizeDate(obj.date) };
  return obj;
}

// ── Dashboard & Overview ────────────────────────────────────────────────

export function getDashboard(date: string, silent = false) {
  return apiGet<DashboardResponse>('get_dashboard', { date }, { silent });
}

export function getAllUsers(silent = false) {
  return apiGet<AllUsersResponse>('get_all_users', {}, { silent });
}

export function getNegativeCredits(silent = false) {
  return apiGet<NegativeCreditsResponse>('get_negative_credits', {}, { silent });
}

// ── Order Operations (Delivery Agent) ───────────────────────────────────

export async function getOrdersByDateSlot(date: string, slot: string, silent = false) {
  const res = await apiGet<OrdersByDateSlotResponse>(
    'get_orders_by_date_slot',
    { date, slot },
    { silent }
  );
  if (res.grouped) {
    res.grouped = res.grouped.map((g) => ({
      ...g,
      orders: g.orders.map(normalizeOrderDates),
    }));
  }
  return res;
}

export function markDelivered(orderId: string, quantityDelivered: number) {
  return apiPost<MarkDeliveredResponse>('mark_delivered', {
    order_id: orderId,
    quantity_delivered: quantityDelivered,
  });
}

// ── Customer Management ─────────────────────────────────────────────────

export function rechargeCredits(userId: string, amount: number) {
  return apiPost<RechargeResponse>('recharge_credits', {
    user_id: userId,
    amount,
  });
}

export function adminUpdateCustomer(
  userId: string,
  data: { name?: string; new_password?: string }
) {
  return apiPost<GenericResponse>('admin_update_customer', {
    user_id: userId,
    ...data,
  });
}

// ── Reports & History ───────────────────────────────────────────────────

export async function getMonthlyReport(
  userId: string,
  startDate: string,
  endDate: string,
  silent = false
) {
  const res = await apiGet<MonthlyReportResponse>(
    'get_monthly_report',
    { user_id: userId, start_date: startDate, end_date: endDate },
    { silent }
  );
  if (res.orders) res.orders = res.orders.map(normalizeOrderDates);
  return res;
}

export function getCreditHistory(
  userId: string,
  startDate: string,
  endDate: string,
  silent = false
) {
  return apiGet<CreditHistoryResponse>(
    'get_credit_history',
    { user_id: userId, start_date: startDate, end_date: endDate },
    { silent }
  );
}

// ── Reconciliation ──────────────────────────────────────────────────────

export function markDayComplete(date: string) {
  return apiPost<ReconcileResponse>('mark_day_complete', { date });
}

// ── Menu Management ─────────────────────────────────────────────────────

export function getMenu(day?: string, slot?: string, silent = false) {
  const params: Record<string, string> = {};
  if (day) params.day = day;
  if (slot) params.slot = slot;
  return apiGet<MenuResponse>('get_menu', params, { silent });
}

export function upsertMenu(
  day: string,
  slot: string,
  dishName: string,
  description?: string
) {
  return apiPost<UpsertMenuResponse>('upsert_menu', {
    day,
    slot,
    dish_name: dishName,
    ...(description !== undefined && { description }),
  });
}

// ── Credit Adjustments ──────────────────────────────────────────────────

export function reduceCreditsAgainstOrder(orderId: string, creditsToAdd: number) {
  return apiPost<ReduceCreditsResponse>('reduce_credits_against_order', {
    order_id: orderId,
    credits_to_add: creditsToAdd,
  });
}
