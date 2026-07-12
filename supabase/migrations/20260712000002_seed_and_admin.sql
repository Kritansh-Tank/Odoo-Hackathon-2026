-- ============================================================
-- TransitOps — Create Admin User + Seed Data
-- Run this SEPARATELY if you already ran 001_initial_schema.sql
-- ============================================================

-- ─── CREATE DEMO USERS ────────────────────────────────────────
-- Creates admin, manager, driver, safety, and finance accounts
-- Email confirmations are bypassed (email_confirmed_at = NOW())

DO $$
DECLARE
  admin_uid UUID := gen_random_uuid();
  fm_uid    UUID := gen_random_uuid();
  dr_uid    UUID := gen_random_uuid();
  so_uid    UUID := gen_random_uuid();
  fa_uid    UUID := gen_random_uuid();
  existing_uid UUID;
BEGIN
  -- 1. Admin
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'admin@transitops.com';
  IF existing_uid IS NULL THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@transitops.com', crypt('Admin@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"TransitOps Admin"}', FALSE, '', '', '', '');
    existing_uid := admin_uid;
  END IF;
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (existing_uid, 'TransitOps Admin', 'admin@transitops.com', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'TransitOps Admin';

  -- 2. Fleet Manager
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'manager@transitops.com';
  IF existing_uid IS NULL THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (fm_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@transitops.com', crypt('Manager@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fleet Manager"}', FALSE, '', '', '', '');
    existing_uid := fm_uid;
  END IF;
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (existing_uid, 'Fleet Manager', 'manager@transitops.com', 'fleet_manager')
  ON CONFLICT (id) DO UPDATE SET role = 'fleet_manager', full_name = 'Fleet Manager';

  -- 3. Driver
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'driver@transitops.com';
  IF existing_uid IS NULL THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (dr_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'driver@transitops.com', crypt('Driver@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Driver"}', FALSE, '', '', '', '');
    existing_uid := dr_uid;
  END IF;
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (existing_uid, 'Demo Driver', 'driver@transitops.com', 'driver')
  ON CONFLICT (id) DO UPDATE SET role = 'driver', full_name = 'Demo Driver';

  -- 4. Safety Officer
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'safety@transitops.com';
  IF existing_uid IS NULL THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (so_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'safety@transitops.com', crypt('Safety@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Safety Officer"}', FALSE, '', '', '', '');
    existing_uid := so_uid;
  END IF;
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (existing_uid, 'Safety Officer', 'safety@transitops.com', 'safety_officer')
  ON CONFLICT (id) DO UPDATE SET role = 'safety_officer', full_name = 'Safety Officer';

  -- 5. Financial Analyst
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'finance@transitops.com';
  IF existing_uid IS NULL THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (fa_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'finance@transitops.com', crypt('Finance@123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Financial Analyst"}', FALSE, '', '', '', '');
    existing_uid := fa_uid;
  END IF;
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (existing_uid, 'Financial Analyst', 'finance@transitops.com', 'financial_analyst')
  ON CONFLICT (id) DO UPDATE SET role = 'financial_analyst', full_name = 'Financial Analyst';

END $$;

-- ─── SEED VEHICLES (skip if already inserted) ─────────────────
INSERT INTO vehicles (registration_number, name, model, type, max_load_capacity, odometer, acquisition_cost, status, region, notes) VALUES
  ('MH-01-AB-1001', 'Truck Alpha',   'Tata Prima 4028.S 2022',  'Truck', 8000,  45230,  2800000, 'Available', 'North',   'Flagship heavy truck'),
  ('MH-01-AB-1002', 'Van Bravo',     'Mahindra Supro 2023',     'Van',   1000,  12800,  750000,  'Available', 'South',   'City delivery van'),
  ('DL-02-CD-2001', 'Truck Charlie', 'Ashok Leyland 2518 IL',   'Truck', 10000, 87000,  3200000, 'In Shop',   'East',    'Scheduled engine overhaul'),
  ('KA-03-EF-3001', 'Van Delta',     'Tata Ace Gold 2023',      'Van',   750,   9200,   620000,  'Available', 'West',    'E-commerce delivery'),
  ('GJ-04-GH-4001', 'Bus Echo',      'Volvo 9400 2021',         'Bus',   5000,  120000, 5500000, 'Retired',   'Central', 'End of service life'),
  ('TN-05-IJ-5001', 'Van Foxtrot',   'Force Traveller 2024',    'Van',   1200,  3400,   890000,  'Available', 'South',   'New addition to fleet')
ON CONFLICT (registration_number) DO NOTHING;

-- ─── SEED DRIVERS (skip if already inserted) ──────────────────
INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status, address) VALUES
  ('Rajesh Kumar',   'DL-0120110012345', 'HMV',      '2026-12-31', '+91 9876543210', 92, 'Available', 'Delhi, DL'),
  ('Anita Sharma',   'MH-1420180056789', 'LMV',      '2025-08-15', '+91 9123456789', 88, 'Available', 'Mumbai, MH'),
  ('Vikram Singh',   'UP-1320150034567', 'HGMV',     '2025-09-20', '+91 9234567890', 75, 'Available', 'Lucknow, UP'),
  ('Priya Patel',    'GJ-0120200078901', 'LMV',      '2027-03-10', '+91 9345678901', 95, 'Available', 'Ahmedabad, GJ'),
  ('Suresh Nair',    'KL-0920160090123', 'Transport', '2025-07-30', '+91 9456789012', 68, 'Available', 'Kochi, KL'),
  ('Mohammed Iqbal', 'TN-1120190012345', 'HMV',      '2026-05-01', '+91 9567890123', 85, 'Available', 'Chennai, TN'),
  ('Deepak Mehra',   'RJ-1420140023456', 'HGMV',     '2024-11-30', '+91 9678901234', 72, 'Suspended', 'Jaipur, RJ'),
  ('Lakshmi Devi',   'AP-1120220034567', 'LMV',      '2028-01-15', '+91 9789012345', 98, 'Off Duty',  'Hyderabad, AP')
ON CONFLICT (license_number) DO NOTHING;
