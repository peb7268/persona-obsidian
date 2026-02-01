-- Persona Job Queue System - Supabase Schema
-- This schema provides durable, observable job tracking for AI agents

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Jobs table with full observability
create table if not exists jobs (
    id uuid primary key default uuid_generate_v4(),
    short_id text unique default substr(uuid_generate_v4()::text, 1, 8),
    job_type text not null,
    payload jsonb not null default '{}',
    status text not null default 'pending'
        check (status in ('pending', 'running', 'completed', 'failed', 'cancelled', 'hung')),

    -- Process tracking
    pid integer,
    hostname text,  -- Which machine is running this

    -- Timestamps
    created_at timestamptz default now(),
    started_at timestamptz,
    completed_at timestamptz,
    last_heartbeat timestamptz,

    -- Results & errors
    exit_code integer,
    error_message text,
    result jsonb,

    -- Delegation chain
    parent_job_id uuid references jobs(id),
    delegated_by text,  -- Which agent delegated this (assistant, cro, etc.)
    assigned_to text,   -- Which agent should handle this

    -- Metadata
    source_file text,
    source_line integer,
    tags text[] default '{}'
);

-- Indexes for common queries
create index if not exists idx_jobs_status on jobs(status);
create index if not exists idx_jobs_type on jobs(job_type);
create index if not exists idx_jobs_created on jobs(created_at desc);
create index if not exists idx_jobs_parent on jobs(parent_job_id);
create index if not exists idx_jobs_assigned on jobs(assigned_to);
create index if not exists idx_jobs_short_id on jobs(short_id);

-- Job logs for detailed observability
create table if not exists job_logs (
    id bigserial primary key,
    job_id uuid references jobs(id) on delete cascade,
    timestamp timestamptz default now(),
    level text not null check (level in ('debug', 'info', 'warn', 'error')),
    message text not null,
    metadata jsonb default '{}'
);

create index if not exists idx_logs_job on job_logs(job_id, timestamp desc);
create index if not exists idx_logs_timestamp on job_logs(timestamp desc);

-- Daily note state for diff tracking
create table if not exists daily_note_state (
    note_path text primary key,
    content_hash text not null,
    last_scanned timestamptz default now(),
    last_content text,
    parsed_data jsonb  -- Store structured parse results
);

-- Agent registry - track your personas
create table if not exists agents (
    id text primary key,  -- 'assistant', 'researcher', 'cro', 'engineer'
    display_name text not null,
    description text,
    capabilities text[] default '{}',
    prompt_template text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Insert initial agents (will not overwrite existing)
insert into agents (id, display_name, description, capabilities)
values
    ('assistant', 'Assistant', 'Personal assistant for daily tasks', array['delegate', 'calendar', 'meeting_notes']),
    ('researcher', 'Researcher', 'Deep research and analysis', array['research', 'summarize', 'cite']),
    ('cro', 'Chief Revenue Officer', 'Sales and revenue strategy', array['sales', 'pipeline', 'forecasting']),
    ('engineer', 'Engineering Director', 'Technical architecture and code', array['code', 'architecture', 'review']),
    ('project-manager', 'Project Manager', 'Project tracking and coordination', array['projects', 'tracking', 'reporting'])
on conflict (id) do nothing;

-- View for job dashboard
create or replace view job_dashboard as
select
    j.short_id,
    j.job_type,
    j.status,
    j.assigned_to,
    j.pid,
    j.created_at,
    j.started_at,
    j.completed_at,
    extract(epoch from (coalesce(j.completed_at, now()) - j.started_at)) as duration_seconds,
    j.error_message,
    j.payload->>'question' as task_preview,
    p.short_id as parent_short_id,
    (select count(*) from jobs c where c.parent_job_id = j.id) as child_count
from jobs j
left join jobs p on j.parent_job_id = p.id
order by j.created_at desc;

-- Enable realtime for live dashboard updates
alter publication supabase_realtime add table jobs;
alter publication supabase_realtime add table job_logs;

-- Function to detect hung jobs (no heartbeat in 5 minutes)
create or replace function detect_hung_jobs(timeout_seconds integer default 300)
returns setof jobs as $$
    select * from jobs
    where status = 'running'
    and (last_heartbeat is null
         or last_heartbeat < now() - (timeout_seconds || ' seconds')::interval)
$$ language sql;

-- Function to clean up old completed jobs
create or replace function cleanup_old_jobs(days_to_keep integer default 30)
returns integer as $$
declare
    deleted_count integer;
begin
    delete from jobs
    where status in ('completed', 'cancelled')
    and created_at < now() - (days_to_keep || ' days')::interval;

    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$ language plpgsql;

-- Function to get job tree (parent and all children)
create or replace function get_job_tree(job_uuid uuid)
returns setof jobs as $$
    with recursive job_tree as (
        -- Start with the given job
        select * from jobs where id = job_uuid
        union all
        -- Add all children recursively
        select j.* from jobs j
        inner join job_tree jt on j.parent_job_id = jt.id
    )
    select * from job_tree
$$ language sql;

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at on agents
create trigger update_agents_updated_at
    before update on agents
    for each row
    execute function update_updated_at_column();

-- Statistics view for monitoring
create or replace view job_statistics as
select
    status,
    count(*) as count,
    avg(extract(epoch from (completed_at - started_at))) as avg_duration_seconds,
    max(extract(epoch from (completed_at - started_at))) as max_duration_seconds
from jobs
where started_at is not null
group by status;

-- Agent workload view
create or replace view agent_workload as
select
    assigned_to,
    status,
    count(*) as job_count,
    max(created_at) as last_job_created
from jobs
where assigned_to is not null
group by assigned_to, status
order by assigned_to, status;

-- Comment on tables for documentation
comment on table jobs is 'Main job queue table tracking all agent tasks';
comment on table job_logs is 'Detailed log entries for each job execution';
comment on table daily_note_state is 'Track daily note changes for diff detection';
comment on table agents is 'Registry of available AI agents and their capabilities';
comment on column jobs.short_id is 'Human-friendly 8-character job identifier';
comment on column jobs.payload is 'Job-specific data (questions, tasks, context)';
comment on column jobs.last_heartbeat is 'Last time the job process reported being alive';
comment on column jobs.delegated_by is 'Agent that created this job (for delegation chains)';
comment on column jobs.assigned_to is 'Agent that should execute this job';
