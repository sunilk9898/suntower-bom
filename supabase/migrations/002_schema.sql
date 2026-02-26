-- ============================================
-- SUN TOWER RWA - Schema Migration 002
-- 12 New Tables + RLS + Indexes + Triggers
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ========== NEW TABLES ==========

-- 1. Residents Directory (replaces residents.json flat file)
CREATE TABLE IF NOT EXISTS residents_directory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  flat_full TEXT,           -- "STA1 103"
  tower TEXT,               -- "STA1"
  flat_no TEXT,             -- "103"
  resident_type TEXT,       -- Owner, Tenant, Owner Family, etc.
  occupancy TEXT,           -- Residing, Let out, Vacant
  status TEXT DEFAULT 'Active',
  mobile TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Complaints Tracker
CREATE TABLE IF NOT EXISTS complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id),
  resident_name TEXT NOT NULL,
  flat_no TEXT NOT NULL,
  category TEXT CHECK (category IN ('Maintenance','Security','Housekeeping','Parking','Noise','Lift','Water','Electrical','Suggestion','Other')),
  subject TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open','Acknowledged','In Progress','Resolved','Closed','Escalated')),
  assigned_to UUID REFERENCES profiles(id),
  assigned_committee TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 3. Financial Summary (monthly snapshots)
CREATE TABLE IF NOT EXISTS financial_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,
  total_collection DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  fund_balance DECIMAL(12,2) DEFAULT 0,
  maintenance_due DECIMAL(12,2) DEFAULT 0,
  maintenance_collected DECIMAL(12,2) DEFAULT 0,
  category_breakup JSONB DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month)
);

-- 4. Events
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('Meeting','Festival','Maintenance','Sports','Cultural','Other')),
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  venue TEXT,
  organizer TEXT,
  rsvp_list JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Polls
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,       -- ["Option A","Option B","Option C"]
  votes JSONB DEFAULT '{}',    -- {"0": ["user_id1"], "1": ["user_id2"]}
  status TEXT DEFAULT 'active' CHECK (status IN ('active','closed')),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Meeting Minutes
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_type TEXT CHECK (meeting_type IN ('BOM','GBM','Committee','Emergency')),
  meeting_date DATE NOT NULL,
  title TEXT NOT NULL,
  attendees TEXT[],
  agenda TEXT,
  minutes_text TEXT,
  ai_summary TEXT,
  decisions JSONB DEFAULT '[]',
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Resolutions Log
CREATE TABLE IF NOT EXISTS resolutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resolution_no TEXT UNIQUE,
  meeting_id UUID REFERENCES meeting_minutes(id),
  title TEXT NOT NULL,
  description TEXT,
  proposed_by TEXT,
  seconded_by TEXT,
  votes_for INT DEFAULT 0,
  votes_against INT DEFAULT 0,
  status TEXT DEFAULT 'Passed' CHECK (status IN ('Passed','Rejected','Deferred','Implemented')),
  implementation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Email Queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message TEXT,
  template TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 9. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_prefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email_notices BOOLEAN DEFAULT TRUE,
  email_complaints BOOLEAN DEFAULT TRUE,
  email_monthly_report BOOLEAN DEFAULT TRUE,
  email_events BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AI Reports Cache
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  report_month DATE,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Payment Tracking (per-flat monthly dues)
CREATE TABLE IF NOT EXISTS payment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flat_no TEXT NOT NULL,
  month DATE NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  payment_date DATE,
  payment_mode TEXT,
  receipt_no TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Paid','Partial','Overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(flat_no, month)
);

-- 12. Gallery / Project Photos
CREATE TABLE IF NOT EXISTS gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========== INDEXES ==========

CREATE INDEX IF NOT EXISTS idx_residents_dir_name ON residents_directory(name);
CREATE INDEX IF NOT EXISTS idx_residents_dir_tower ON residents_directory(tower);
CREATE INDEX IF NOT EXISTS idx_residents_dir_flat ON residents_directory(flat_full);
CREATE INDEX IF NOT EXISTS idx_residents_dir_status ON residents_directory(status);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_resident ON complaints(resident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_summary_month ON financial_summary(month DESC);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);

CREATE INDEX IF NOT EXISTS idx_meeting_minutes_type ON meeting_minutes(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_date ON meeting_minutes(meeting_date DESC);

CREATE INDEX IF NOT EXISTS idx_resolutions_status ON resolutions(status);
CREATE INDEX IF NOT EXISTS idx_resolutions_meeting ON resolutions(meeting_id);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_profile ON notification_prefs(profile_id);

CREATE INDEX IF NOT EXISTS idx_ai_reports_type ON ai_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_ai_reports_month ON ai_reports(report_month);

CREATE INDEX IF NOT EXISTS idx_payment_tracking_flat ON payment_tracking(flat_no);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_month ON payment_tracking(month DESC);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_status ON payment_tracking(status);

CREATE INDEX IF NOT EXISTS idx_gallery_project ON gallery(project_id);


-- ========== ENABLE RLS ==========

ALTER TABLE residents_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;


-- ========== RLS POLICIES ==========

-- RESIDENTS DIRECTORY
CREATE POLICY "Auth users read residents directory"
  ON residents_directory FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages residents directory"
  ON residents_directory FOR ALL
  USING (get_my_role() = 'admin');

CREATE POLICY "BOM inserts residents directory"
  ON residents_directory FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates residents directory"
  ON residents_directory FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));


-- COMPLAINTS
CREATE POLICY "Residents read own complaints"
  ON complaints FOR SELECT
  USING (auth.uid() = resident_id);

CREATE POLICY "BOM reads all complaints"
  ON complaints FOR SELECT
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Auth users create complaints"
  ON complaints FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "BOM updates complaints"
  ON complaints FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Residents update own complaints"
  ON complaints FOR UPDATE
  USING (auth.uid() = resident_id AND status = 'Open');

CREATE POLICY "Admin deletes complaints"
  ON complaints FOR DELETE
  USING (get_my_role() = 'admin');


-- FINANCIAL SUMMARY
CREATE POLICY "Auth users read financial summary"
  ON financial_summary FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin manages financial summary"
  ON financial_summary FOR ALL
  USING (get_my_role() = 'admin');

CREATE POLICY "BOM inserts financial summary"
  ON financial_summary FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates financial summary"
  ON financial_summary FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));


-- EVENTS
CREATE POLICY "Auth users read events"
  ON events FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "BOM manages events"
  ON events FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates events"
  ON events FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Admin deletes events"
  ON events FOR DELETE
  USING (get_my_role() = 'admin');


-- POLLS
CREATE POLICY "Auth users read polls"
  ON polls FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "BOM creates polls"
  ON polls FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Auth users update polls (voting)"
  ON polls FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin deletes polls"
  ON polls FOR DELETE
  USING (get_my_role() = 'admin');


-- MEETING MINUTES
CREATE POLICY "Auth users read meeting minutes"
  ON meeting_minutes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "BOM creates meeting minutes"
  ON meeting_minutes FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates meeting minutes"
  ON meeting_minutes FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Admin deletes meeting minutes"
  ON meeting_minutes FOR DELETE
  USING (get_my_role() = 'admin');


-- RESOLUTIONS
CREATE POLICY "Auth users read resolutions"
  ON resolutions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "BOM creates resolutions"
  ON resolutions FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates resolutions"
  ON resolutions FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Admin deletes resolutions"
  ON resolutions FOR DELETE
  USING (get_my_role() = 'admin');


-- EMAIL QUEUE (admin-only management, system inserts)
CREATE POLICY "Admin reads email queue"
  ON email_queue FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "System inserts email queue"
  ON email_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin updates email queue"
  ON email_queue FOR UPDATE
  USING (get_my_role() = 'admin');


-- NOTIFICATION PREFERENCES
CREATE POLICY "Users read own notification prefs"
  ON notification_prefs FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Admin reads all notification prefs"
  ON notification_prefs FOR SELECT
  USING (get_my_role() = 'admin');

CREATE POLICY "Users manage own notification prefs"
  ON notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users update own notification prefs"
  ON notification_prefs FOR UPDATE
  USING (auth.uid() = profile_id);


-- AI REPORTS (read by all auth users, write by system/admin)
CREATE POLICY "Auth users read AI reports"
  ON ai_reports FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System inserts AI reports"
  ON ai_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin manages AI reports"
  ON ai_reports FOR ALL
  USING (get_my_role() = 'admin');


-- PAYMENT TRACKING
CREATE POLICY "Residents read own payment tracking"
  ON payment_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND flat_no = payment_tracking.flat_no
    )
  );

CREATE POLICY "BOM reads all payment tracking"
  ON payment_tracking FOR SELECT
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Admin manages payment tracking"
  ON payment_tracking FOR ALL
  USING (get_my_role() = 'admin');

CREATE POLICY "BOM inserts payment tracking"
  ON payment_tracking FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates payment tracking"
  ON payment_tracking FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));


-- GALLERY
CREATE POLICY "Auth users read gallery"
  ON gallery FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "BOM manages gallery"
  ON gallery FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "BOM updates gallery"
  ON gallery FOR UPDATE
  USING (get_my_role() IN ('admin', 'bom'));

CREATE POLICY "Admin deletes gallery"
  ON gallery FOR DELETE
  USING (get_my_role() = 'admin');


-- ========== UPDATED_AT TRIGGERS ==========

CREATE TRIGGER residents_directory_updated_at BEFORE UPDATE ON residents_directory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== STORAGE BUCKETS ==========
-- Run these in SQL editor or via Supabase Dashboard → Storage:
-- 1. Create bucket 'complaints' (public: false) for complaint photos
-- 2. Create bucket 'gallery' (public: true) for project gallery photos
-- 3. Create bucket 'meeting-files' (public: false) for meeting minute attachments

-- Storage policies (run in SQL editor):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('complaints', 'complaints', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-files', 'meeting-files', false);
