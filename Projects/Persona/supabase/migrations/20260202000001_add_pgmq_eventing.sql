-- Migration: Add pgmq eventing system
-- Description: Enable pgmq extension, create job_events queue, and events audit table
-- Date: 2026-02-02

-- ============================================================================
-- STEP 0: Create jobs table (if not exists)
-- ============================================================================
-- The jobs table is the source of truth for job status
-- short_id is auto-generated as first 8 chars of the UUID
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_id TEXT UNIQUE NOT NULL DEFAULT substr(gen_random_uuid()::text, 1, 8),
  job_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  pid INTEGER,
  hostname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ,
  exit_code INTEGER,
  error_message TEXT,
  result JSONB,
  parent_job_id UUID REFERENCES jobs(id),
  delegated_by TEXT,
  assigned_to TEXT,
  source_file TEXT,
  source_line INTEGER,
  tags TEXT[] DEFAULT '{}'
);

-- Trigger to set short_id from id if not provided
CREATE OR REPLACE FUNCTION set_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
    NEW.short_id := substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_job_short_id ON jobs;
CREATE TRIGGER set_job_short_id
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_short_id();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_short_id ON jobs(short_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- ============================================================================
-- STEP 1: Enable pgmq extension
-- ============================================================================
-- pgmq is a Postgres-native message queue with guaranteed delivery
CREATE EXTENSION IF NOT EXISTS pgmq;

-- ============================================================================
-- STEP 2: Create the job_events queue
-- ============================================================================
-- This queue stores all job lifecycle events for guaranteed delivery
SELECT pgmq.create('job_events');

-- ============================================================================
-- STEP 3: Create events audit table
-- ============================================================================
-- Central observability table - all events are logged here for tracing/debugging
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  job_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,  -- 'typescript', 'python', 'bash', 'claude'
  trace_id TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_job_id ON events(job_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

-- ============================================================================
-- STEP 4: Create helper functions for event publishing
-- ============================================================================

-- Function to publish an event (sends to queue AND logs to events table)
CREATE OR REPLACE FUNCTION publish_event(
  p_type TEXT,
  p_job_id TEXT,
  p_source TEXT,
  p_trace_id TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_event JSONB;
  v_msg_id BIGINT;
BEGIN
  -- Build the event payload
  v_event := jsonb_build_object(
    'type', p_type,
    'job_id', p_job_id,
    'timestamp', NOW(),
    'source', p_source,
    'trace_id', COALESCE(p_trace_id, ''),
    'data', p_data
  );

  -- Send to queue (guaranteed delivery)
  SELECT pgmq.send('job_events', v_event) INTO v_msg_id;

  -- Also log to events table (for observability)
  INSERT INTO events (type, job_id, source, trace_id, data, timestamp)
  VALUES (p_type, p_job_id, p_source, p_trace_id, p_data, NOW());

  RETURN jsonb_build_object(
    'success', true,
    'msg_id', v_msg_id,
    'event', v_event
  );
END;
$$ LANGUAGE plpgsql;

-- Function to read events from queue (with visibility timeout)
CREATE OR REPLACE FUNCTION read_events(
  p_qty INTEGER DEFAULT 10,
  p_visibility_timeout INTEGER DEFAULT 30
) RETURNS SETOF JSONB AS $$
BEGIN
  RETURN QUERY
  SELECT row_to_json(r)::jsonb
  FROM pgmq.read('job_events', p_visibility_timeout, p_qty) r;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a processed event from queue
CREATE OR REPLACE FUNCTION delete_event(p_msg_id BIGINT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN pgmq.delete('job_events', p_msg_id);
END;
$$ LANGUAGE plpgsql;

-- Function to archive an event (keeps in archive table instead of deleting)
CREATE OR REPLACE FUNCTION archive_event(p_msg_id BIGINT) RETURNS BOOLEAN AS $$
BEGIN
  RETURN pgmq.archive('job_events', p_msg_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Enable Realtime for jobs table (if not already enabled)
-- ============================================================================
-- This allows TypeScript to subscribe to job changes in real-time
-- Note: If jobs is already in the publication, this will be a no-op
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Grant permissions
-- ============================================================================
-- Grant usage on pgmq schema
GRANT USAGE ON SCHEMA pgmq TO authenticated;
GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT USAGE ON SCHEMA pgmq TO anon;

-- Grant access to pgmq tables (queue tables created by pgmq.create())
GRANT ALL ON ALL TABLES IN SCHEMA pgmq TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA pgmq TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pgmq TO anon;

-- Grant access to pgmq sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA pgmq TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pgmq TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pgmq TO anon;

-- Grant access to pgmq functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO anon;

-- Allow authenticated users to use the queue functions
GRANT EXECUTE ON FUNCTION publish_event TO authenticated;
GRANT EXECUTE ON FUNCTION read_events TO authenticated;
GRANT EXECUTE ON FUNCTION delete_event TO authenticated;
GRANT EXECUTE ON FUNCTION archive_event TO authenticated;
GRANT EXECUTE ON FUNCTION publish_event TO anon;
GRANT EXECUTE ON FUNCTION read_events TO anon;
GRANT EXECUTE ON FUNCTION delete_event TO anon;
GRANT EXECUTE ON FUNCTION archive_event TO anon;

-- Allow service role full access
GRANT EXECUTE ON FUNCTION publish_event TO service_role;
GRANT EXECUTE ON FUNCTION read_events TO service_role;
GRANT EXECUTE ON FUNCTION delete_event TO service_role;
GRANT EXECUTE ON FUNCTION archive_event TO service_role;

-- Grant access to events table
GRANT SELECT, INSERT ON events TO authenticated;
GRANT SELECT, INSERT ON events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO service_role;

-- Grant access to jobs table
GRANT SELECT, INSERT, UPDATE ON jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO service_role;

COMMENT ON TABLE events IS 'Central audit log for all job lifecycle events - used for observability and debugging';
COMMENT ON FUNCTION publish_event IS 'Publish an event to the job_events queue and log to events table';
