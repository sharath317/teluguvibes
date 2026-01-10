-- Migration: Create admin audit log table
-- Purpose: Track all admin actions for audibility

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  
  -- What
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'verify', 'lock', 'unlock', 'resolve', etc.
  entity_type TEXT NOT NULL,  -- 'movie', 'celebrity', 'review', 'conflict', etc.
  entity_id TEXT NOT NULL,
  entity_title TEXT,
  
  -- Changes
  before_state JSONB,
  after_state JSONB,
  changes JSONB,  -- Specific fields that changed
  
  -- Metadata
  reason TEXT,
  source TEXT,  -- 'admin_ui', 'api', 'script', 'auto'
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast queries
  CONSTRAINT valid_action CHECK (
    action IN (
      'create', 'update', 'delete', 'publish', 'unpublish',
      'verify', 'unverify', 'lock', 'unlock',
      'approve', 'reject', 'resolve', 'dismiss',
      'merge', 'split', 'classify', 'enrich',
      'import', 'export', 'bulk_update'
    )
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Create verification_queue table
CREATE TABLE IF NOT EXISTS verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference
  entity_type TEXT NOT NULL,  -- 'movie', 'celebrity'
  entity_id TEXT NOT NULL,
  entity_title TEXT,
  
  -- Field being verified
  field TEXT NOT NULL,
  current_value JSONB,
  suggested_value JSONB,
  
  -- Sources
  sources JSONB,  -- Array of { source, value, trust, fetchedAt }
  consensus_score NUMERIC(3, 2),
  
  -- Status
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'deferred'
  priority TEXT DEFAULT 'normal',  -- 'low', 'normal', 'high', 'critical'
  
  -- Resolution
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'deferred')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  UNIQUE(entity_type, entity_id, field)
);

CREATE INDEX IF NOT EXISTS idx_verification_queue_status ON verification_queue(status);
CREATE INDEX IF NOT EXISTS idx_verification_queue_priority ON verification_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_verification_queue_entity ON verification_queue(entity_type, entity_id);

-- Create conflicts table
CREATE TABLE IF NOT EXISTS source_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_title TEXT,
  
  -- Conflict details
  field TEXT NOT NULL,
  claims JSONB NOT NULL,  -- Array of { source, value, trustLevel, fetchedAt }
  severity TEXT NOT NULL,  -- 'minor', 'major', 'critical'
  
  -- Status
  status TEXT DEFAULT 'open',  -- 'open', 'resolved', 'dismissed'
  
  -- Resolution
  resolution JSONB,  -- { resolvedValue, resolvedBy, resolvedAt, reason }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_conflict_severity CHECK (severity IN ('minor', 'major', 'critical')),
  CONSTRAINT valid_conflict_status CHECK (status IN ('open', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_conflicts_status ON source_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON source_conflicts(severity);
CREATE INDEX IF NOT EXISTS idx_conflicts_entity ON source_conflicts(entity_type, entity_id);

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_user_id TEXT,
  p_user_email TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_entity_title TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'admin_ui'
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    user_id, user_email, action, entity_type, entity_id, entity_title,
    before_state, after_state, changes, reason, source
  ) VALUES (
    p_user_id, p_user_email, p_action, p_entity_type, p_entity_id, p_entity_title,
    p_before_state, p_after_state, p_changes, p_reason, p_source
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Add comments
COMMENT ON TABLE admin_audit_log IS 'Tracks all administrative actions for auditing and compliance';
COMMENT ON TABLE verification_queue IS 'Queue of facts awaiting human verification';
COMMENT ON TABLE source_conflicts IS 'Records of data conflicts between external sources';


