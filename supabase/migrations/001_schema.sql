-- ============================================
-- SUN TOWER RWA - Supabase Database Schema
-- Migration 001: Initial Schema + RLS Policies
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ========== TABLES ==========

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  flat_no TEXT,
  mobile TEXT,
  role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('admin','bom','resident')),
  position TEXT,
  committees TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Registration Requests
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_name TEXT NOT NULL,
  flat_no TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  permissions JSONB DEFAULT '{"read":true,"write":false}',
  reviewed_by UUID REFERENCES profiles(id),
  request_date TIMESTAMPTZ DEFAULT NOW(),
  review_date TIMESTAMPTZ
);

-- 3. Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  committee TEXT NOT NULL CHECK (committee IN ('A','B','C','D','E','F','G')),
  status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned','In Progress','Tender','On Hold','Completed')),
  timeline TEXT,
  budget TEXT DEFAULT 'TBD',
  progress INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Project Updates
CREATE TABLE IF NOT EXISTS project_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Project Expenses
CREATE TABLE IF NOT EXISTS project_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  vendor TEXT,
  date DATE,
  bom_approved BOOLEAN DEFAULT FALSE,
  gbm_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notices
CREATE TABLE IF NOT EXISTS notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT DEFAULT 'General' CHECK (category IN ('General','Financial','Maintenance','Event','Emergency','Meeting','Escalation')),
  date DATE DEFAULT CURRENT_DATE,
  file_url TEXT,
  file_type TEXT,
  is_auto BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Committee Members
CREATE TABLE IF NOT EXISTS committee_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  committee TEXT NOT NULL CHECK (committee IN ('A','B','C','D','E','F','G')),
  role TEXT NOT NULL CHECK (role IN ('convenor','bom_member','resident_1','resident_2','resident_3')),
  member_name TEXT,
  profile_id UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(committee, role)
);

-- 8. Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('public','bom_only','admin_only')),
  file_url TEXT,
  file_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_projects_committee ON projects(committee);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_notices_category ON notices(category);
CREATE INDEX IF NOT EXISTS idx_notices_date ON notices(date DESC);
CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON committee_members(committee);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);

-- ========== ENABLE RLS ==========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ========== HELPER FUNCTION ==========
-- Get current user's role without recursion
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ========== RLS POLICIES ==========

-- PROFILES
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin reads all profiles"
  ON profiles FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "BOM reads active profiles"
  ON profiles FOR SELECT
  USING (get_my_role() = 'bom' AND status = 'active');

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin manages all profiles"
  ON profiles FOR ALL
  USING (get_my_role() = 'admin');

-- Auto-create profile on signup (trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'resident'),
    'active'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- REGISTRATION REQUESTS
CREATE POLICY "Anyone can submit registration"
  ON registration_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin reads all requests"
  ON registration_requests FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Admin manages requests"
  ON registration_requests FOR UPDATE
  USING (get_my_role() = 'admin');

-- PROJECTS
CREATE POLICY "BOM and admin read all projects"
  ON projects FOR SELECT
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Resident reads committee projects"
  ON projects FOR SELECT
  USING (
    get_my_role() = 'resident'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND committees @> ARRAY[projects.committee]
    )
  );

CREATE POLICY "BOM creates projects"
  ON projects FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates own committee projects"
  ON projects FOR UPDATE
  USING (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'bom'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND committees @> ARRAY[projects.committee]
      )
    )
  );

CREATE POLICY "Admin deletes projects"
  ON projects FOR DELETE
  USING (get_my_role() = 'admin');

-- PROJECT UPDATES
CREATE POLICY "Auth users read project updates"
  ON project_updates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "BOM creates updates"
  ON project_updates FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

-- PROJECT EXPENSES
CREATE POLICY "Auth users read expenses"
  ON project_expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "BOM creates expenses"
  ON project_expenses FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Admin approves expenses"
  ON project_expenses FOR UPDATE
  USING (get_my_role() = 'admin');

-- NOTICES
CREATE POLICY "Auth users read non-escalation notices"
  ON notices FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      category != 'Escalation'
      OR get_my_role() IN ('admin', 'bom')
    )
  );

CREATE POLICY "BOM creates notices"
  ON notices FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Admin manages notices"
  ON notices FOR ALL
  USING (get_my_role() = 'admin');

-- COMMITTEE MEMBERS
CREATE POLICY "Auth users read committee members"
  ON committee_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages committee members"
  ON committee_members FOR ALL
  USING (get_my_role() = 'admin');

-- MESSAGES
CREATE POLICY "Auth users read messages"
  ON messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auth users create messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- AUDIT LOG
CREATE POLICY "Admin reads audit log"
  ON audit_log FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "System inserts audit log"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- DOCUMENTS
CREATE POLICY "Public docs for authenticated"
  ON documents FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND category = 'public'
  );

CREATE POLICY "BOM docs for BOM"
  ON documents FOR SELECT
  USING (
    get_my_role() IN ('admin', 'bom')
    AND category IN ('public', 'bom_only')
  );

CREATE POLICY "Admin docs for admin"
  ON documents FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Admin manages documents"
  ON documents FOR ALL
  USING (get_my_role() = 'admin');

-- ========== UPDATED_AT TRIGGER ==========
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
