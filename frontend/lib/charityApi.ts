/** Typed helpers for the charity area's backend routes (/api/charity/*). */

import { api } from './api';
import type { EventCoverType, EventStatus, OrderStatus } from './types';

export interface CharityMe {
  user: { id: string; email: string; name: string | null; role: 'owner' | 'member' };
  charity: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    location: string | null;
    contact_name: string | null;
    postcode: string | null;
    tax_id: string | null;
    bunnings_store_id: string | null;
    subscription_status: string;
    created_at: string;
    bunnings_stores: { id: string; location: string; suburb: string | null; postcode: string | null } | null;
  };
}

export interface CharityEvent {
  id: string;
  event_date: string;
  event_name: string | null;
  status: EventStatus;
  cover_type: EventCoverType | null;
  estimated_hotdogs: number | null;
  estimated_staff: number | null;
  number_of_shifts: number | null;
  actual_hotdogs_sold: number | null;
  number_of_sales: number | null;
  sales_value_aud: number | null;
  requested_by_charity: boolean;
  created_at: string;
  bunnings_stores: { id: string; location: string; suburb: string | null; state: string | null; postcode: string | null; store_address: string | null; store_phone: string | null } | null;
  event_packages: { quantity: number; packages: { name: string } | null }[];
}

export interface CharityOrder {
  id: string;
  event_date: string;
  status: OrderStatus;
  delivery_address: string;
  delivery_contact_name: string | null;
  delivery_phone: string | null;
  special_requests: string | null;
  total_price_aud: number;
  created_at: string;
  packages: { name: string; description: string | null } | null;
  /** Present on the single-order view once an invoice has been issued. */
  invoice?: { invoice_number: string; issue_date: string; due_date: string; amount_aud: number; status: 'issued' | 'paid'; paid_at: string | null } | null;
}

export interface CharityPerson {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'member';
  is_active: boolean;
  invited_at: string;
  last_sign_in_at: string | null;
}

export const charityApi = {
  me: () => api.get<{ data: CharityMe }>('/api/charity/me'),
  updateProfile: (input: Partial<Pick<CharityMe['charity'], 'contact_name' | 'email' | 'phone' | 'location' | 'postcode' | 'bunnings_store_id'>>) =>
    api.patch<{ data: CharityMe['charity'] }>('/api/charity/profile', input),
  events: () => api.get<{ data: CharityEvent[] }>('/api/charity/events'),
  event: (id: string) => api.get<{ data: CharityEvent }>(`/api/charity/events/${id}`),
  requestEvent: (input: { event_date: string; bunnings_store_id: string; event_name?: string | null; alternative_dates?: string | null; message?: string | null }) =>
    api.post<{ data: CharityEvent }>('/api/charity/events', input),
  saveResults: (id: string, input: { actual_hotdogs_sold: number | null; number_of_sales: number | null; sales_value_aud: number | null }) =>
    api.patch<{ data: CharityEvent }>(`/api/charity/events/${id}/results`, input),
  orders: () => api.get<{ data: CharityOrder[] }>('/api/charity/orders'),
  order: (id: string) => api.get<{ data: CharityOrder }>(`/api/charity/orders/${id}`),
  people: () => api.get<{ data: CharityPerson[]; me: string }>('/api/charity/users'),
  addPerson: (input: { email: string; name: string }) => api.post<{ data: { emailSent: boolean; emailError?: string } }>('/api/charity/users', input),
  setPersonActive: (id: string, is_active: boolean) => api.patch<{ data: CharityPerson }>(`/api/charity/users/${id}`, { is_active }),
  bunningsStores: () => api.get<{ data: { id: string; location: string }[] }>('/api/public/bunnings-stores', undefined, true),
};
