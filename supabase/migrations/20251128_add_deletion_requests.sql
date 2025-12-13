-- Migration: Add deletion_requests table for Google Play/Apple account deletion compliance
-- Created: 2025-11-28

-- Create deletion_requests table
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, processing, completed, cancelled
  reason TEXT,
  lang TEXT DEFAULT 'zh', -- zh or en
  ip_address TEXT,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX idx_deletion_requests_token ON deletion_requests(token);
CREATE INDEX idx_deletion_requests_email ON deletion_requests(email);
CREATE INDEX idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX idx_deletion_requests_created_at ON deletion_requests(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
  ON deletion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all deletion requests (for API endpoints)
CREATE POLICY "Service role can manage all deletion requests"
  ON deletion_requests
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE deletion_requests IS 'Account deletion requests for Google Play/Apple compliance';
COMMENT ON COLUMN deletion_requests.status IS 'pending: awaiting email confirmation, confirmed: user clicked link, processing: deletion in progress, completed: account deleted, cancelled: user cancelled request';
COMMENT ON COLUMN deletion_requests.token IS 'One-time token for email confirmation link';
COMMENT ON COLUMN deletion_requests.expires_at IS 'Token expiration time (default 24 hours from creation)';
