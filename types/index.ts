// ─── ENUMS ────────────────────────────────────────────────────

export type UserRole = 'admin' | 'fleet_manager' | 'driver' | 'safety_officer' | 'financial_analyst';
export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';
export type VehicleType = 'Truck' | 'Van' | 'Car' | 'Bus' | 'Motorcycle' | 'Other';
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
export type MaintenanceStatus = 'Open' | 'In Progress' | 'Closed';
export type ExpenseType = 'Toll' | 'Parking' | 'Loading' | 'Other';
export type LicenseStatus = 'Valid' | 'Expiring Soon' | 'Expired';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type MaintenancePriority = 'Low' | 'Normal' | 'High' | 'Critical';

// ─── PROFILE ──────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ─── VEHICLE ──────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  registration_number: string;
  name: string;
  model: string;
  type: VehicleType;
  max_load_capacity: number;
  odometer: number;
  acquisition_cost: number;
  status: VehicleStatus;
  region: string;
  image_url?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
}

export interface VehicleCostSummary {
  id: string;
  registration_number: string;
  name: string;
  acquisition_cost: number;
  status: VehicleStatus;
  type: VehicleType;
  region: string;
  total_fuel_cost: number;
  total_fuel_liters: number;
  total_maintenance_cost: number;
  total_expense_cost: number;
  total_operational_cost: number;
  total_revenue: number;
  total_distance: number;
  completed_trips: number;
}

// ─── DRIVER ───────────────────────────────────────────────────

export interface Driver {
  id: string;
  profile_id?: string;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string;
  safety_score: number;
  status: DriverStatus;
  address?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverWithExpiry extends Driver {
  days_until_expiry: number;
  license_status: LicenseStatus;
}

// ─── TRIP ─────────────────────────────────────────────────────

export interface Trip {
  id: string;
  trip_number: string;
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  planned_distance: number;
  actual_distance?: number;
  fuel_consumed?: number;
  revenue: number;
  status: TripStatus;
  ai_risk_level?: RiskLevel;
  ai_risk_summary?: string;
  ai_risk_recommendations?: string[];
  notes?: string;
  dispatched_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: Vehicle;
  driver?: Driver;
  created_by_profile?: Profile;
}

// ─── MAINTENANCE ──────────────────────────────────────────────

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string;
  cost: number;
  technician?: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  start_date: string;
  end_date?: string;
  ai_summary?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: Vehicle;
}

// ─── FUEL LOG ─────────────────────────────────────────────────

export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id?: string;
  liters: number;
  cost: number;
  date: string;
  odometer_reading?: number;
  station?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  // Joined
  vehicle?: Vehicle;
  trip?: Trip;
}

// ─── EXPENSE ──────────────────────────────────────────────────

export interface Expense {
  id: string;
  vehicle_id?: string;
  trip_id?: string;
  type: ExpenseType;
  description?: string;
  amount: number;
  date: string;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
  // Joined
  vehicle?: Vehicle;
  trip?: Trip;
}

// ─── NOTIFICATION ─────────────────────────────────────────────

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

// ─── SYSTEM SETTING ───────────────────────────────────────────

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

// ─── DASHBOARD KPIs ───────────────────────────────────────────

export interface DashboardKPIs {
  totalVehicles: number;
  availableVehicles: number;
  vehiclesOnTrip: number;
  vehiclesInShop: number;
  vehiclesRetired: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  totalDrivers: number;
  fleetUtilization: number; // percentage
  expiringLicenses: number;
  expiredLicenses: number;
}

// ─── REPORTS ──────────────────────────────────────────────────

export interface FuelEfficiencyData {
  vehicle_id: string;
  vehicle_name: string;
  registration_number: string;
  total_distance: number;
  total_fuel: number;
  efficiency: number; // km/L
  cost_per_km: number;
}

export interface FleetUtilizationData {
  status: VehicleStatus;
  count: number;
  percentage: number;
}

export interface MonthlyOperationalCost {
  month: string;
  fuel_cost: number;
  maintenance_cost: number;
  other_cost: number;
  total: number;
}

export interface VehicleROIData {
  vehicle_id: string;
  vehicle_name: string;
  registration_number: string;
  revenue: number;
  operational_cost: number;
  acquisition_cost: number;
  roi: number; // percentage
  profit: number;
}

// ─── AI ───────────────────────────────────────────────────────

export interface DispatchRiskAssessment {
  risk: RiskLevel;
  score: number;
  summary: string;
  recommendations: string[];
}

// ─── API RESPONSES ────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── FORM TYPES ───────────────────────────────────────────────

export interface VehicleFormData {
  registration_number: string;
  name: string;
  model: string;
  type: VehicleType;
  max_load_capacity: number;
  odometer: number;
  acquisition_cost: number;
  region: string;
  notes?: string;
}

export interface DriverFormData {
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string;
  safety_score: number;
  address?: string;
  notes?: string;
}

export interface TripFormData {
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  planned_distance: number;
  notes?: string;
}

export interface TripCompleteFormData {
  actual_distance: number;
  fuel_consumed: number;
  revenue: number;
  notes?: string;
}

export interface MaintenanceFormData {
  vehicle_id: string;
  maintenance_type: string;
  description: string;
  cost: number;
  technician?: string;
  priority: MaintenancePriority;
  start_date: string;
}

export interface FuelLogFormData {
  vehicle_id: string;
  trip_id?: string;
  liters: number;
  cost: number;
  date: string;
  odometer_reading?: number;
  station?: string;
}

export interface ExpenseFormData {
  vehicle_id?: string;
  trip_id?: string;
  type: ExpenseType;
  description?: string;
  amount: number;
  date: string;
}

// ─── FILTER TYPES ─────────────────────────────────────────────

export interface VehicleFilters {
  search?: string;
  status?: VehicleStatus | 'all';
  type?: VehicleType | 'all';
  region?: string;
  sortBy?: keyof Vehicle;
  sortOrder?: 'asc' | 'desc';
}

export interface TripFilters {
  search?: string;
  status?: TripStatus | 'all';
  vehicle_id?: string;
  driver_id?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DriverFilters {
  search?: string;
  status?: DriverStatus | 'all';
  licenseStatus?: LicenseStatus | 'all';
}
