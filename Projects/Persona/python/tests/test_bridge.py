"""Tests for bridge.py commands."""

import json
import pytest
from unittest.mock import MagicMock, patch, mock_open
from datetime import datetime, timezone, timedelta

import persona.bridge as bridge
from persona.core.job_store import Job, JobStatus


class TestCreateJob:
    """Tests for create_job command."""

    def test_create_job_basic(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should create a job and return job info."""
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.create_job({
                'type': 'research',
                'payload': {'question': 'What is AI?'},
                'agent': 'researcher'
            })

            assert result['id'] == '550e8400-e29b-41d4-a716-446655440000'
            assert result['shortId'] == 'abc12345'
            assert result['type'] == 'research'
            assert result['status'] == 'pending'
            assert result['assignedTo'] == 'researcher'

    def test_create_job_with_source(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should pass source file and line to job store."""
        mock_supabase_client.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.create_job({
                'type': 'research',
                'payload': {'question': 'Test'},
                'sourceFile': 'daily/2025-01-15.md',
                'sourceLine': 42
            })

            insert_data = mock_supabase_client.table.return_value.insert.call_args[0][0]
            assert insert_data['source_file'] == 'daily/2025-01-15.md'
            assert insert_data['source_line'] == 42


class TestGetJobStatus:
    """Tests for get_job_status command."""

    def test_get_job_status(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should return full job status."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_job_status('abc12345')

            assert result['id'] == '550e8400-e29b-41d4-a716-446655440000'
            assert result['shortId'] == 'abc12345'
            assert result['type'] == 'research'
            assert result['status'] == 'pending'

    def test_get_job_status_not_found(self, mock_supabase_client, mock_env_vars):
        """Should return error if job not found."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_job_status('nonexistent')

            assert result == {'error': 'Job not found'}


class TestGetPendingJobs:
    """Tests for get_pending_jobs command."""

    def test_get_pending_jobs(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should return list of pending jobs."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_pending_jobs()

            assert 'jobs' in result
            assert len(result['jobs']) == 1
            assert result['jobs'][0]['shortId'] == 'abc12345'
            assert result['jobs'][0]['status'] == 'pending'

    def test_get_pending_jobs_with_agent_filter(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should filter by agent."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_pending_jobs('researcher')

            assert 'jobs' in result


class TestGetRunningJobs:
    """Tests for get_running_jobs command."""

    def test_get_running_jobs(self, mock_supabase_client, sample_running_job_row, mock_env_vars):
        """Should return list of running jobs with PIDs."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_running_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_running_jobs()

            assert 'jobs' in result
            assert len(result['jobs']) == 1
            assert result['jobs'][0]['status'] == 'running'
            assert result['jobs'][0]['pid'] == 12345


class TestGetCompletedJobs:
    """Tests for get_completed_jobs command."""

    def test_get_completed_jobs(self, mock_supabase_client, sample_completed_job_row, mock_env_vars):
        """Should return completed and failed jobs."""
        mock_supabase_client.table.return_value.select.return_value.in_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_completed_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_completed_jobs(limit=20)

            assert 'jobs' in result
            assert len(result['jobs']) == 1


class TestGetHungJobs:
    """Tests for get_hung_jobs command."""

    def test_get_hung_jobs(self, mock_supabase_client, sample_running_job_row, mock_env_vars):
        """Should return jobs running longer than threshold."""
        # Make started_at old enough to be hung
        old_job = {
            **sample_running_job_row,
            'started_at': (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        }
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.lt.return_value.execute.return_value = MagicMock(
            data=[old_job]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_hung_jobs(threshold_minutes=5)

            assert 'jobs' in result


class TestGetFailedJobs:
    """Tests for get_failed_jobs command."""

    def test_get_failed_jobs(self, mock_supabase_client, sample_failed_job_row, mock_env_vars):
        """Should return only failed jobs."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[sample_failed_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_failed_jobs(limit=20)

            assert 'jobs' in result
            assert len(result['jobs']) == 1
            assert result['jobs'][0]['status'] == 'failed'


class TestGetJobLogs:
    """Tests for get_job_logs command."""

    def test_get_job_logs(self, sample_job_row, mock_env_vars):
        """Should return job logs."""
        log_entries = [
            {'timestamp': '2025-01-15T10:00:00Z', 'level': 'info', 'message': 'Started', 'metadata': {}},
            {'timestamp': '2025-01-15T10:01:00Z', 'level': 'info', 'message': 'Processing', 'metadata': {}},
        ]
        # Create a fresh mock to avoid chain conflicts
        client = MagicMock()

        # First call for get_job (short_id lookup)
        job_select_mock = MagicMock()
        job_select_mock.eq.return_value.execute.return_value = MagicMock(data=[sample_job_row])

        # Second call for logs (job_id lookup with order/limit)
        log_select_mock = MagicMock()
        log_select_mock.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=log_entries)

        # Track calls to return different mocks
        def table_side_effect(name):
            table_mock = MagicMock()
            if name == 'jobs':
                table_mock.select.return_value = job_select_mock
            elif name == 'job_logs':
                table_mock.select.return_value = log_select_mock
            return table_mock

        client.table.side_effect = table_side_effect

        with patch('persona.core.job_store.create_client', return_value=client):
            result = bridge.get_job_logs('abc12345', limit=50)

            assert 'logs' in result
            assert len(result['logs']) == 2


class TestGetLocalLogs:
    """Tests for get_local_logs command."""

    def test_get_local_logs_file_exists(self, mock_env_vars, tmp_path):
        """Should read logs from local file."""
        log_content = """[2025-01-15 10:00:00] Started processing
[2025-01-15 10:01:00] Processing complete
"""
        with patch('persona.bridge.Path') as mock_path:
            mock_file = MagicMock()
            mock_file.exists.return_value = True
            mock_path.return_value.__truediv__.return_value.__truediv__.return_value.__truediv__.return_value.__truediv__.return_value.__truediv__.return_value = mock_file

            with patch('builtins.open', mock_open(read_data=log_content)):
                result = bridge.get_local_logs('TestBusiness', 'researcher', '2025-01-15')

                assert 'logs' in result
                assert result['source'] == 'local'

    def test_get_local_logs_file_not_found(self, mock_env_vars):
        """Should return empty logs if file not found."""
        with patch('persona.bridge.Path') as mock_path:
            mock_file = MagicMock()
            mock_file.exists.return_value = False
            mock_file.__str__ = lambda self: '/test/path/log.log'
            mock_path.return_value.__truediv__.return_value.__truediv__.return_value.__truediv__.return_value.__truediv__.return_value.__truediv__.return_value = mock_file

            result = bridge.get_local_logs('TestBusiness', 'researcher', '2025-01-15')

            assert result['logs'] == []
            assert result['exists'] == False


class TestGetJobSummary:
    """Tests for get_job_summary command."""

    def test_get_job_summary(self, mock_supabase_client, mock_env_vars):
        """Should return counts by status."""
        # Setup mock to return different counts for each status
        def make_count_response(count):
            mock = MagicMock()
            mock.count = count
            return mock

        status_counts = {
            'pending': 5,
            'running': 2,
            'completed': 100,
            'failed': 3,
            'cancelled': 1,
            'hung': 0,
        }

        def mock_execute(*args, **kwargs):
            return make_count_response(status_counts.get('pending', 0))

        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            make_count_response(5),   # pending
            make_count_response(2),   # running
            make_count_response(100), # completed
            make_count_response(3),   # failed
            make_count_response(1),   # cancelled
            make_count_response(0),   # hung
        ]

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_job_summary()

            assert result['pending'] == 5
            assert result['running'] == 2
            assert result['completed'] == 100
            assert result['failed'] == 3
            assert result['cancelled'] == 1
            assert result['hung'] == 0


class TestUpdateJobStatus:
    """Tests for update_job_status command."""

    def test_update_job_status_running(self, mock_supabase_client, sample_job_row, sample_running_job_row, mock_env_vars):
        """Should update status to running."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_running_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.update_job_status('abc12345', {'status': 'running'})

            assert result['success'] == True
            assert result['status'] == 'running'

    def test_update_job_status_completed(self, mock_supabase_client, sample_job_row, sample_completed_job_row, mock_env_vars):
        """Should update status to completed."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_completed_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.update_job_status('abc12345', {'status': 'completed'})

            assert result['success'] == True

    def test_update_job_status_failed(self, mock_supabase_client, sample_job_row, sample_failed_job_row, mock_env_vars):
        """Should update status to failed with error."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_failed_job_row]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.update_job_status('abc12345', {'status': 'failed', 'error': 'Connection timeout'})

            assert result['success'] == True

    def test_update_job_status_cancelled(self, mock_supabase_client, sample_job_row, mock_env_vars):
        """Should update status to cancelled."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[sample_job_row]
        )
        mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{**sample_job_row, 'status': 'cancelled'}]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.update_job_status('abc12345', {'status': 'cancelled'})

            assert result['success'] == True

    def test_update_job_status_not_found(self, mock_supabase_client, mock_env_vars):
        """Should return error if job not found."""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.update_job_status('nonexistent', {'status': 'completed'})

            assert result == {'error': 'Job not found'}


class TestGetAgentDailyPerformance:
    """Tests for get_agent_daily_performance command."""

    def test_get_agent_daily_performance(self, mock_supabase_client, mock_env_vars):
        """Should return daily performance metrics."""
        jobs_data = [
            {
                'assigned_to': 'researcher',
                'started_at': '2025-01-15T10:00:00Z',
                'completed_at': '2025-01-15T10:05:00Z',
                'status': 'completed'
            },
            {
                'assigned_to': 'researcher',
                'started_at': '2025-01-15T11:00:00Z',
                'completed_at': '2025-01-15T11:03:00Z',
                'status': 'completed'
            },
        ]
        mock_supabase_client.table.return_value.select.return_value.not_.return_value.is_.return_value.not_.return_value.is_.return_value.gte.return_value.execute.return_value = MagicMock(
            data=jobs_data
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_agent_daily_performance()

            assert 'metrics' in result
            # Should have aggregated metrics

    def test_get_agent_daily_performance_with_filter(self, mock_supabase_client, mock_env_vars):
        """Should filter by agent."""
        mock_supabase_client.table.return_value.select.return_value.not_.return_value.is_.return_value.not_.return_value.is_.return_value.eq.return_value.gte.return_value.execute.return_value = MagicMock(
            data=[]
        )

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            result = bridge.get_agent_daily_performance(agent='researcher', days=7)

            assert 'metrics' in result


class TestMainCLI:
    """Tests for main CLI function."""

    def test_main_no_command(self, capsys):
        """Should output error if no command provided."""
        with patch('sys.argv', ['bridge.py']):
            with pytest.raises(SystemExit) as exc_info:
                bridge.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert 'No command provided' in captured.out

    def test_main_unknown_command(self, capsys):
        """Should output error for unknown command."""
        with patch('sys.argv', ['bridge.py', 'unknown_command']):
            with pytest.raises(SystemExit) as exc_info:
                bridge.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert 'Unknown command' in captured.out

    def test_main_create_job_missing_data(self, capsys):
        """Should output error if job data missing."""
        with patch('sys.argv', ['bridge.py', 'create_job']):
            with pytest.raises(SystemExit) as exc_info:
                bridge.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert 'No job data provided' in captured.out

    def test_main_get_job_status_missing_id(self, capsys):
        """Should output error if job ID missing."""
        with patch('sys.argv', ['bridge.py', 'get_job_status']):
            with pytest.raises(SystemExit) as exc_info:
                bridge.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert 'No job ID provided' in captured.out

    def test_main_get_job_summary(self, mock_supabase_client, mock_env_vars, capsys):
        """Should output job summary as JSON."""
        # Setup mock counts
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            MagicMock(count=5),  # pending
            MagicMock(count=2),  # running
            MagicMock(count=100),  # completed
            MagicMock(count=3),  # failed
            MagicMock(count=1),  # cancelled
            MagicMock(count=0),  # hung
        ]

        with patch('persona.core.job_store.create_client', return_value=mock_supabase_client):
            with patch('sys.argv', ['bridge.py', 'get_job_summary']):
                bridge.main()

        captured = capsys.readouterr()
        result = json.loads(captured.out)
        assert 'pending' in result

    def test_main_update_job_status_missing_args(self, capsys):
        """Should output error if job ID and data missing."""
        with patch('sys.argv', ['bridge.py', 'update_job_status', 'abc12345']):
            with pytest.raises(SystemExit) as exc_info:
                bridge.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert 'Job ID and data required' in captured.out

    def test_main_get_local_logs_missing_args(self, capsys):
        """Should output error if local logs args missing."""
        with patch('sys.argv', ['bridge.py', 'get_local_logs', 'Business']):
            with pytest.raises(SystemExit) as exc_info:
                bridge.main()

            assert exc_info.value.code == 1

        captured = capsys.readouterr()
        assert 'Usage' in captured.out

    def test_main_exception_handling(self, mock_env_vars, capsys):
        """Should output error on exception."""
        with patch('persona.core.job_store.create_client', side_effect=Exception('Connection failed')):
            with patch('sys.argv', ['bridge.py', 'get_job_summary']):
                with pytest.raises(SystemExit) as exc_info:
                    bridge.main()

                assert exc_info.value.code == 1

        captured = capsys.readouterr()
        result = json.loads(captured.out)
        assert 'error' in result
        assert 'Connection failed' in result['error']
