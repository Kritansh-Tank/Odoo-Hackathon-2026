import type { Driver, Vehicle, Trip, DriverStatus, VehicleStatus, TripStatus } from '@/types';

// ─── MANDATORY BUSINESS RULES ─────────────────────────────────
// All rules enforced BOTH client-side (UI feedback) and server-side (API validation)

/**
 * Rule 1: Vehicle registration number must be unique
 * Enforced by DB UNIQUE constraint + checked in form
 */

/**
 * Rule 2: Retired / In Shop vehicles must never appear in dispatch pool
 */
export function isVehicleDispatchable(vehicle: Vehicle): boolean {
  return vehicle.status === 'Available';
}

export function getVehicleDispatchBlockReason(vehicle: Vehicle): string | null {
  if (vehicle.status === 'Retired') return `${vehicle.name} is Retired and cannot be dispatched.`;
  if (vehicle.status === 'In Shop') return `${vehicle.name} is currently In Shop for maintenance.`;
  if (vehicle.status === 'On Trip') return `${vehicle.name} is already On Trip.`;
  return null;
}

/**
 * Rule 3: Expired license or Suspended status → cannot be assigned to trips
 */
export function isDriverDispatchable(driver: Driver): boolean {
  if (driver.status === 'Suspended') return false;
  if (driver.status === 'On Trip') return false;
  const expiryDate = new Date(driver.license_expiry_date);
  if (expiryDate < new Date()) return false;
  return true;
}

export function getDriverDispatchBlockReason(driver: Driver): string | null {
  if (driver.status === 'Suspended') return `${driver.name} is Suspended.`;
  if (driver.status === 'On Trip') return `${driver.name} is already On Trip.`;
  const expiryDate = new Date(driver.license_expiry_date);
  if (expiryDate < new Date()) {
    return `${driver.name}'s license expired on ${expiryDate.toLocaleDateString('en-IN')}.`;
  }
  return null;
}

/**
 * Rule 4: Driver/Vehicle already On Trip → cannot assign to another trip
 * (Covered by Rules 2 & 3 above)
 */

/**
 * Rule 5: Cargo weight must not exceed vehicle max load capacity
 */
export function validateCargoWeight(cargoWeight: number, vehicle: Vehicle): {
  valid: boolean;
  message?: string;
  percentage: number;
} {
  const percentage = Math.round((cargoWeight / vehicle.max_load_capacity) * 100);

  if (cargoWeight > vehicle.max_load_capacity) {
    return {
      valid: false,
      message: `Cargo weight (${cargoWeight} kg) exceeds ${vehicle.name}'s maximum capacity of ${vehicle.max_load_capacity} kg.`,
      percentage,
    };
  }

  if (percentage > 90) {
    return {
      valid: true,
      message: `Warning: Cargo is at ${percentage}% of max capacity. Consider using a larger vehicle.`,
      percentage,
    };
  }

  return { valid: true, percentage };
}

/**
 * Rule 6: Dispatching a trip → vehicle + driver become "On Trip"
 */
export function getStatusOnDispatch(): {
  vehicle: VehicleStatus;
  driver: DriverStatus;
  trip: TripStatus;
} {
  return {
    vehicle: 'On Trip',
    driver: 'On Trip',
    trip: 'Dispatched',
  };
}

/**
 * Rule 7: Completing a trip → vehicle + driver become "Available"
 */
export function getStatusOnComplete(): {
  vehicle: VehicleStatus;
  driver: DriverStatus;
  trip: TripStatus;
} {
  return {
    vehicle: 'Available',
    driver: 'Available',
    trip: 'Completed',
  };
}

/**
 * Rule 8: Cancelling a dispatched trip → vehicle + driver become "Available"
 */
export function getStatusOnCancel(trip: Trip): {
  vehicle?: VehicleStatus;
  driver?: DriverStatus;
  trip: TripStatus;
} {
  // Only revert vehicle/driver if trip was actually dispatched
  if (trip.status === 'Dispatched') {
    return {
      vehicle: 'Available',
      driver: 'Available',
      trip: 'Cancelled',
    };
  }
  return { trip: 'Cancelled' };
}

/**
 * Rule 9: Creating active maintenance record → vehicle becomes "In Shop"
 */
export function getStatusOnMaintenanceCreate(): VehicleStatus {
  return 'In Shop';
}

/**
 * Rule 10: Closing maintenance → vehicle becomes "Available" (unless Retired)
 */
export function getStatusOnMaintenanceClose(currentVehicleStatus: VehicleStatus): VehicleStatus {
  if (currentVehicleStatus === 'Retired') return 'Retired';
  return 'Available';
}

// ─── VALIDATION HELPERS ───────────────────────────────────────

export function validateTripDispatch(
  vehicle: Vehicle,
  driver: Driver,
  cargoWeight: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const vehicleReason = getVehicleDispatchBlockReason(vehicle);
  if (vehicleReason) errors.push(vehicleReason);

  const driverReason = getDriverDispatchBlockReason(driver);
  if (driverReason) errors.push(driverReason);

  const cargoValidation = validateCargoWeight(cargoWeight, vehicle);
  if (!cargoValidation.valid && cargoValidation.message) {
    errors.push(cargoValidation.message);
  }

  return { valid: errors.length === 0, errors };
}

// ─── LICENSE STATUS HELPERS ───────────────────────────────────

export function getLicenseDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getLicenseStatus(expiryDate: string): 'Valid' | 'Expiring Soon' | 'Expired' {
  const days = getLicenseDaysUntilExpiry(expiryDate);
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring Soon';
  return 'Valid';
}

// ─── ROI CALCULATION ──────────────────────────────────────────

export function calculateVehicleROI(
  revenue: number,
  maintenanceCost: number,
  fuelCost: number,
  acquisitionCost: number
): number {
  if (acquisitionCost === 0) return 0;
  return ((revenue - (maintenanceCost + fuelCost)) / acquisitionCost) * 100;
}

export function calculateFuelEfficiency(distanceKm: number, fuelLiters: number): number {
  if (fuelLiters === 0) return 0;
  return Math.round((distanceKm / fuelLiters) * 10) / 10;
}

export function calculateCostPerKm(totalCost: number, distanceKm: number): number {
  if (distanceKm === 0) return 0;
  return Math.round((totalCost / distanceKm) * 100) / 100;
}

export function calculateFleetUtilization(onTripCount: number, totalActive: number): number {
  if (totalActive === 0) return 0;
  return Math.round((onTripCount / totalActive) * 100);
}
