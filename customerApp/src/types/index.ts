export interface Customer {
  user_id: string;
  name: string;
  mobile: string;
  password: string;
  address_1: string;
  address_2: string;
  address_3: string;
  credit_balance: number;
  created_at: string;
  is_active: boolean;
}

export interface Order {
  order_id: string;
  user_id: string;
  date: string;
  slot: 'lunch' | 'dinner';
  type: 'veg' | 'non-veg';
  address: string;
  quantity_ordered: number;
  quantity_delivered: number;
  credits_used: number;
  is_delivered: boolean;
  delivered_at: string;
  created_at: string;
  is_skipped: boolean;
}

export interface MonthlyReportSummary {
  user_id: string;
  from: string;
  to: string;
  total_ordered: number;
  total_delivered: number;
  total_skipped: number;
  total_credits_deducted: number;
}

export interface MonthlyReportOrder {
  order_id: string;
  date: string;
  slot: 'lunch' | 'dinner';
  quantity_ordered: number;
  quantity_delivered: number;
  credits_deducted: number;
  is_delivered: boolean;
  is_skipped: boolean;
}

export interface MonthlyReport {
  summary: MonthlyReportSummary;
  orders: MonthlyReportOrder[];
}

// API Payloads
export interface CreateCustomerPayload {
  name: string;
  mobile: string;
  password: string;
  address_1: string;
  address_2?: string;
  address_3?: string;
}

export interface OnboardCustomerPayload extends CreateCustomerPayload {
  plan: 'lunch' | 'dinner' | 'both';
  start_date: string;
  end_date: string;
}

export interface UpdateCustomerPayload {
  user_id: string;
  name?: string;
  password?: string;
  address_1?: string;
  address_2?: string;
  address_3?: string;
}

export interface UpdateOrderPayload {
  order_id: string;
  type?: 'veg' | 'non-veg';
  address?: string;
  quantity_ordered?: number;
}

export interface AddOrderSlotPayload {
  user_id: string;
  date: string;
  slot: 'lunch' | 'dinner';
  address: string;
  type?: 'veg' | 'non-veg';
  quantity_ordered?: number;
}

export interface ExtendPlanPayload {
  user_id: string;
  plan: 'lunch' | 'dinner' | 'both';
  days: number;
  start_date: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// ── Credit History ────────────────────────────────────────────────────────

export interface CreditHistoryItem {
  history_id: string;
  user_id: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  created_at: string;
}

export interface CreditHistoryResponse {
  success: boolean;
  summary: {
    total_credited: number;
    total_debited: number;
    net: number;
  };
  total: number;
  history: CreditHistoryItem[];
}

// ── Menu ──────────────────────────────────────────────────────────────────

export interface MenuItem {
  menu_id: string;
  day: string;
  slot: 'lunch' | 'dinner';
  dish_name: string;
  description: string;
}

export interface GetMenuResponse {
  success: boolean;
  total: number;
  menu: MenuItem[];
}
