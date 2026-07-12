-- ============================================================
-- TransitOps — Initial Schema Migration
-- Safe to re-run on pre-existing schemas (Idempotent)
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
    CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'In Shop', 'Retired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
    CREATE TYPE vehicle_type AS ENUM ('Truck', 'Van', 'Car', 'Bus', 'Motorcycle', 'Other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_status') THEN
    CREATE TYPE driver_status AS ENUM ('Available', 'On Trip', 'Off Duty', 'Suspended');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
    CREATE TYPE trip_status AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
    CREATE TYPE maintenance_status AS ENUM ('Open', 'In Progress', 'Closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_type') THEN
    CREATE TYPE expense_type AS ENUM ('Toll', 'Parking', 'Loading', 'Other');
  END IF;
END$$;

-- ─── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'driver',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'driver'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── VEHICLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  type vehicle_type NOT NULL DEFAULT 'Van',
  max_load_capacity NUMERIC NOT NULL CHECK (max_load_capacity > 0),
  odometer NUMERIC DEFAULT 0 CHECK (odometer >= 0),
  acquisition_cost NUMERIC NOT NULL CHECK (acquisition_cost > 0),
  status vehicle_status DEFAULT 'Available',
  region TEXT DEFAULT 'Central',
  image_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE TO authenticated USING (true);

-- ─── VEHICLE DOCUMENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_docs_select" ON vehicle_documents;
CREATE POLICY "vehicle_docs_select" ON vehicle_documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vehicle_docs_insert" ON vehicle_documents;
CREATE POLICY "vehicle_docs_insert" ON vehicle_documents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vehicle_docs_delete" ON vehicle_documents;
CREATE POLICY "vehicle_docs_delete" ON vehicle_documents FOR DELETE TO authenticated USING (true);

-- ─── DRIVERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  license_category TEXT NOT NULL DEFAULT 'LMV',
  license_expiry_date DATE NOT NULL,
  contact_number TEXT NOT NULL,
  safety_score NUMERIC DEFAULT 100 CHECK (safety_score >= 0 AND safety_score <= 100),
  status driver_status DEFAULT 'Available',
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE TO authenticated USING (true);

-- ─── TRIPS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
  driver_id UUID REFERENCES drivers(id) NOT NULL,
  cargo_weight NUMERIC NOT NULL CHECK (cargo_weight > 0),
  planned_distance NUMERIC NOT NULL CHECK (planned_distance > 0),
  actual_distance NUMERIC CHECK (actual_distance >= 0),
  fuel_consumed NUMERIC CHECK (fuel_consumed >= 0),
  revenue NUMERIC DEFAULT 0 CHECK (revenue >= 0),
  status trip_status DEFAULT 'Draft',
  ai_risk_level TEXT CHECK (ai_risk_level IN ('Low', 'Medium', 'High')),
  ai_risk_summary TEXT,
  ai_risk_recommendations JSONB DEFAULT '[]',
  notes TEXT,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trips_insert" ON trips;
CREATE POLICY "trips_insert" ON trips FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "trips_update" ON trips;
CREATE POLICY "trips_update" ON trips FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "trips_delete" ON trips;
CREATE POLICY "trips_delete" ON trips FOR DELETE TO authenticated USING (true);

-- Auto-generate trip number
CREATE SEQUENCE IF NOT EXISTS trip_number_seq START 1;
CREATE OR REPLACE FUNCTION generate_trip_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.trip_number := 'TRP-' || LPAD(nextval('trip_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_trip_number ON trips;
CREATE TRIGGER set_trip_number
  BEFORE INSERT ON trips
  FOR EACH ROW
  WHEN (NEW.trip_number IS NULL OR NEW.trip_number = '')
  EXECUTE FUNCTION generate_trip_number();

-- ─── MAINTENANCE LOGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
  maintenance_type TEXT NOT NULL,
  description TEXT NOT NULL,
  cost NUMERIC DEFAULT 0 CHECK (cost >= 0),
  technician TEXT,
  status maintenance_status DEFAULT 'Open',
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Critical')),
  start_date DATE NOT NULL,
  end_date DATE,
  ai_summary TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_select" ON maintenance_logs;
CREATE POLICY "maintenance_select" ON maintenance_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_logs;
CREATE POLICY "maintenance_insert" ON maintenance_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "maintenance_update" ON maintenance_logs;
CREATE POLICY "maintenance_update" ON maintenance_logs FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_logs;
CREATE POLICY "maintenance_delete" ON maintenance_logs FOR DELETE TO authenticated USING (true);

-- ─── FUEL LOGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
  trip_id UUID REFERENCES trips(id),
  liters NUMERIC NOT NULL CHECK (liters > 0),
  cost NUMERIC NOT NULL CHECK (cost > 0),
  date DATE NOT NULL,
  odometer_reading NUMERIC CHECK (odometer_reading >= 0),
  station TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_logs_select" ON fuel_logs;
CREATE POLICY "fuel_logs_select" ON fuel_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "fuel_logs_insert" ON fuel_logs;
CREATE POLICY "fuel_logs_insert" ON fuel_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "fuel_logs_update" ON fuel_logs;
CREATE POLICY "fuel_logs_update" ON fuel_logs FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "fuel_logs_delete" ON fuel_logs;
CREATE POLICY "fuel_logs_delete" ON fuel_logs FOR DELETE TO authenticated USING (true);

-- ─── EXPENSES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id),
  trip_id UUID REFERENCES trips(id),
  type expense_type NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  receipt_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (true);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (auth.uid() = recipient_id);

-- ─── SYSTEM SETTINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON system_settings;
CREATE POLICY "settings_select" ON system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_update" ON system_settings;
CREATE POLICY "settings_update" ON system_settings FOR UPDATE TO authenticated USING (true);

-- Default settings
INSERT INTO system_settings (key, value, description) VALUES
  ('rate_per_km', '15', 'Revenue rate per kilometer (₹)'),
  ('license_expiry_warning_days', '30', 'Days before license expiry to show warning'),
  ('email_reminders_enabled', 'true', 'Send email reminders for expiring licenses'),
  ('email_reminder_days', '30', 'Days before expiry to send email reminder'),
  ('app_name', 'TransitOps', 'Application name'),
  ('default_regions', 'North,South,East,West,Central', 'Comma-separated list of regions')
ON CONFLICT (key) DO NOTHING;

-- ─── USEFUL VIEWS ────────────────────────────────────────────

-- Vehicle cost summary view
CREATE OR REPLACE VIEW vehicle_cost_summary AS
SELECT
  v.id,
  v.registration_number,
  v.name,
  v.acquisition_cost,
  v.status,
  v.type,
  v.region,
  COALESCE(SUM(fl.cost), 0) AS total_fuel_cost,
  COALESCE(SUM(fl.liters), 0) AS total_fuel_liters,
  COALESCE(SUM(ml.cost), 0) AS total_maintenance_cost,
  COALESCE(SUM(e.amount), 0) AS total_expense_cost,
  COALESCE(SUM(fl.cost), 0) + COALESCE(SUM(ml.cost), 0) + COALESCE(SUM(e.amount), 0) AS total_operational_cost,
  COALESCE(SUM(t.revenue), 0) AS total_revenue,
  COALESCE(SUM(t.actual_distance), 0) AS total_distance,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed') AS completed_trips
FROM vehicles v
LEFT JOIN fuel_logs fl ON fl.vehicle_id = v.id
LEFT JOIN maintenance_logs ml ON ml.vehicle_id = v.id AND ml.status = 'Closed'
LEFT JOIN expenses e ON e.vehicle_id = v.id
LEFT JOIN trips t ON t.vehicle_id = v.id
GROUP BY v.id;

-- Driver expiry view
CREATE OR REPLACE VIEW drivers_expiry_status AS
SELECT
  d.*,
  (d.license_expiry_date - CURRENT_DATE) AS days_until_expiry,
  CASE
    WHEN d.license_expiry_date < CURRENT_DATE THEN 'Expired'
    WHEN d.license_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END AS license_status
FROM drivers d;

-- ─── REALTIME ────────────────────────────────────────────────
-- Clean up existing realtime setups safely
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notifications, vehicles, trips, drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications, vehicles, trips, drivers;
