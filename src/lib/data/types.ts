/** Row types matching supabase/migrations (hand-written; keep in sync with the SQL). */

export interface Motorcycle {
  id: string
  user_id: string
  nickname: string
  make: string | null
  model: string | null
  year: number | null
  engine_cc: number | null
  plate_number: string | null
  vin: string | null
  current_odometer: number
  purchase_date: string | null
  photo_url: string | null
  created_at: string
}

export interface MaintenanceType {
  id: string
  user_id: string | null
  name: string
  default_interval_km: number | null
  default_interval_days: number | null
  icon: string | null
  sort_order: number
}

export interface MaintenanceSchedule {
  id: string
  motorcycle_id: string
  maintenance_type_id: string
  interval_km: number | null
  interval_days: number | null
  active: boolean
}

export interface ScheduleWithType extends MaintenanceSchedule {
  maintenance_types: MaintenanceType
}

export interface MaintenanceLog {
  id: string
  motorcycle_id: string
  maintenance_type_id: string
  performed_at: string // YYYY-MM-DD
  odometer: number
  cost: number | null
  workshop_name: string | null
  google_place_id: string | null
  notes: string | null
  receipt_url: string | null
  created_at: string
}

export interface OdometerReading {
  id: string
  motorcycle_id: string
  odometer: number
  recorded_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  distance_unit: 'km' | 'mi'
  currency: string
}
