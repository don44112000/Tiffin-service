import type {
  Customer,
  CreateCustomerPayload,
  OnboardCustomerPayload,
  UpdateCustomerPayload,
  UpdateOrderPayload,
  AddOrderSlotPayload,
  ExtendPlanPayload,
  Order,
  MonthlyReport,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const SECRET = import.meta.env.VITE_API_SECRET as string;

// ── Generic helpers ────────────────────────────────────────────────────────

async function apiGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ action, secret: SECRET, ...params });
  const url = `${BASE_URL}?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Unknown error');
  return data as T;
}

async function apiPost<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, secret: SECRET, ...body }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Unknown error');
  return data as T;
}

// ── Auth / Customer ────────────────────────────────────────────────────────

export async function loginCustomer(
  mobile: string,
  password: string
): Promise<{ customer: Customer }> {
  return apiGet('get_customer', { mobile, password });
}

export async function createCustomer(
  payload: CreateCustomerPayload
): Promise<{ user_id: string; message: string }> {
  return apiPost('create_customer', payload as unknown as Record<string, unknown>);
}

export async function onboardCustomer(
  payload: OnboardCustomerPayload
): Promise<{
  user_id: string;
  orders_created: number;
  plan: string;
  from: string;
  to: string;
}> {
  return apiPost('onboard_customer', payload as unknown as Record<string, unknown>);
}

export async function updateCustomer(
  payload: UpdateCustomerPayload
): Promise<{ message: string }> {
  return apiPost('update_customer', payload as unknown as Record<string, unknown>);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function normalizeOrderDate<T extends { date?: string }>(o: T): T {
  if (o.date && typeof o.date === 'string' && o.date.includes('T')) {
    const d = new Date(o.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { ...o, date: `${yyyy}-${mm}-${dd}` };
  }
  return o;
}

// ── Orders ────────────────────────────────────────────────────────────────

export async function getOrdersByUser(
  user_id: string,
  start_date: string,
  end_date: string
): Promise<{ orders: Order[]; total: number }> {
  const res = await apiGet<{ orders: Order[]; total: number }>('get_orders_by_user', { user_id, start_date, end_date });
  if (res.orders) res.orders = res.orders.map(normalizeOrderDate);
  return res;
}

export async function getMonthlyReport(
  user_id: string,
  start_date: string,
  end_date: string
): Promise<MonthlyReport> {
  const res = await apiGet<MonthlyReport>('get_monthly_report', { user_id, start_date, end_date });
  if (res.orders) res.orders = res.orders.map(normalizeOrderDate);
  return res;
}

export async function updateOrder(
  payload: UpdateOrderPayload
): Promise<{ message: string }> {
  return apiPost('update_order', payload as unknown as Record<string, unknown>);
}

export async function addOrderSlot(
  payload: AddOrderSlotPayload
): Promise<{ order_id: string; message: string }> {
  return apiPost('add_order_slot', payload as unknown as Record<string, unknown>);
}

export async function skipOrder(order_id: string): Promise<{ message: string }> {
  return apiPost('skip_order', { order_id });
}

export async function extendPlan(
  payload: ExtendPlanPayload
): Promise<{
  user_id: string;
  plan: string;
  from: string;
  to: string;
  orders_created: number;
}> {
  return apiPost('extend_plan', payload as unknown as Record<string, unknown>);
}
