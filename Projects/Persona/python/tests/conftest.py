"""Pytest configuration and fixtures for Persona tests."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone


@pytest.fixture(autouse=True)
def reset_bridge_store():
    """Reset the bridge singleton store before each test."""
    from persona import bridge
    bridge.reset_store()
    yield
    bridge.reset_store()


@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client."""
    client = MagicMock()

    # Setup table mock chain
    table_mock = MagicMock()
    client.table.return_value = table_mock

    # Setup select chain
    select_mock = MagicMock()
    table_mock.select.return_value = select_mock
    select_mock.eq.return_value = select_mock
    select_mock.not_.return_value = select_mock
    select_mock.is_.return_value = select_mock
    select_mock.in_.return_value = select_mock
    select_mock.lt.return_value = select_mock
    select_mock.gte.return_value = select_mock
    select_mock.order.return_value = select_mock
    select_mock.limit.return_value = select_mock

    # Default empty response
    select_mock.execute.return_value = MagicMock(data=[], count=0)

    # Setup insert chain
    insert_mock = MagicMock()
    table_mock.insert.return_value = insert_mock
    insert_mock.execute.return_value = MagicMock(data=[])

    # Setup update chain
    update_mock = MagicMock()
    table_mock.update.return_value = update_mock
    update_mock.eq.return_value = update_mock
    update_mock.execute.return_value = MagicMock(data=[])

    # Setup RPC mock
    client.rpc.return_value = select_mock

    return client


@pytest.fixture
def sample_job_row():
    """Sample job row from database."""
    return {
        'id': '550e8400-e29b-41d4-a716-446655440000',
        'short_id': 'abc12345',
        'job_type': 'research',
        'payload': {'question': 'What is AI?'},
        'status': 'pending',
        'pid': None,
        'hostname': 'test-host',
        'created_at': '2025-01-15T10:00:00Z',
        'started_at': None,
        'completed_at': None,
        'last_heartbeat': None,
        'exit_code': None,
        'error_message': None,
        'result': None,
        'parent_job_id': None,
        'delegated_by': None,
        'assigned_to': 'researcher',
        'source_file': 'daily/2025-01-15.md',
        'source_line': 42,
        'tags': ['research', 'daily-note'],
    }


@pytest.fixture
def sample_running_job_row(sample_job_row):
    """Sample running job row."""
    return {
        **sample_job_row,
        'status': 'running',
        'pid': 12345,
        'started_at': '2025-01-15T10:01:00Z',
        'last_heartbeat': '2025-01-15T10:02:00Z',
    }


@pytest.fixture
def sample_completed_job_row(sample_job_row):
    """Sample completed job row."""
    return {
        **sample_job_row,
        'status': 'completed',
        'pid': 12345,
        'started_at': '2025-01-15T10:01:00Z',
        'completed_at': '2025-01-15T10:05:00Z',
        'exit_code': 0,
        'result': {'answer': 'AI is artificial intelligence.'},
    }


@pytest.fixture
def sample_failed_job_row(sample_job_row):
    """Sample failed job row."""
    return {
        **sample_job_row,
        'status': 'failed',
        'pid': 12345,
        'started_at': '2025-01-15T10:01:00Z',
        'completed_at': '2025-01-15T10:03:00Z',
        'exit_code': 1,
        'error_message': 'Connection timeout',
    }


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Set up mock environment variables."""
    monkeypatch.setenv('SUPABASE_URL', 'http://localhost:54321')
    monkeypatch.setenv('SUPABASE_KEY', 'test-key')
    monkeypatch.setenv('PERSONA_ROOT', '/test/persona')
