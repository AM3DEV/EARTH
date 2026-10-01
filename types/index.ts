export type Role = 'user' | 'admin' | 'boss_admin';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'expired' | 'rejected';
export type TargetType = 'monument' | 'event' | 'company' | 'service';
export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'cancelled';
export type SupportDiscountStatus = 'active' | 'scheduled' | 'expired' | 'cancelled' | 'used' | 'pending_allocation';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  avatar_url?: string | null;
  language: 'en' | 'ar';
  created_at: string;
}

export interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  type?: string | null;
}

export interface Monument {
  id: string;
  category_id?: string | null;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  price?: number | null;
  currency?: string | null;
  opening_hours?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
}

export interface EventItem {
  id: string;
  category_id?: string | null;
  title_ar: string;
  title_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  price?: number | null;
  currency?: string | null;
  organizer?: string | null;
  phone?: string | null;
  website?: string | null;
  capacity?: number | null;
  active: boolean;
}

export interface Company {
  id: string;
  category_id?: string | null;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  opening_hours?: string | null;
  rating?: number | null;
  verified?: boolean;
  active: boolean;
  avg_rating?: number | null;
  review_count?: number | null;
}

export interface ServiceItem {
  id: string;
  company_id?: string | null;
  category_id?: string | null;
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  base_price: number;
  current_price: number;
  currency: string;
  duration?: string | null;
  max_booking: number;
  current_booking: number;
  available: boolean;
}

export interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  company_id?: string | null;
  booking_date: string;
  quantity: number;
  base_price: number;
  capacity_percentage?: number | null;
  price_increase_percentage?: number | null;
  price_increase_amount?: number | null;
  dynamic_price?: number | null;
  support_discount_percentage?: number | null;
  support_discount_amount?: number | null;
  final_price: number;
  currency: string;
  status: BookingStatus;
  booking_reference: string;
}

export interface Review {
  id: string;
  user_id: string;
  target_type: TargetType;
  target_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface PricingThreshold { min: number; max: number; increase: number; }

export interface PriceQuote {
  capacity_percentage: number;
  price_increase_percentage: number;
  price_increase_amount: number;
  dynamic_price: number;
  support_discount_percentage: number;
  support_discount_amount: number;
  final_price: number;
  currency: string;
}
