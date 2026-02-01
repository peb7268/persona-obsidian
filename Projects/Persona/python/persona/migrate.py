#!/usr/bin/env python3
"""Migration script to import existing state files into Supabase."""

import json
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import click

from persona.core.job_store import JobStore, JobStatus

load_dotenv()


class StateMigrator:
    """Migrate existing Persona state files to Supabase."""

    def __init__(self, persona_root: Path):
        """
        Initialize migrator.

        Args:
            persona_root: Root directory of Persona system
        """
        self.persona_root = persona_root
        self.business = os.environ.get("PERSONA_BUSINESS", "PersonalMCO")
        self.instance_root = persona_root / "instances" / self.business
        self.state_dir = self.instance_root / "state"

        self.job_store = JobStore()

    def migrate_executions(self) -> int:
        """
        Migrate execution history from executions.json.

        Returns:
            Number of executions migrated
        """
        executions_file = self.state_dir / "executions.json"

        if not executions_file.exists():
            click.echo(f"No executions.json found at {executions_file}")
            return 0

        with open(executions_file) as f:
            data = json.load(f)

        migrated = 0

        for execution in data.get("executions", []):
            # Map old execution format to job format
            agent = execution.get("agent", "unknown")
            action = execution.get("action", "unknown")
            status = execution.get("status", "completed")

            # Map status
            if status == "success":
                job_status = JobStatus.COMPLETED
            elif status == "failed":
                job_status = JobStatus.FAILED
            elif status == "running":
                job_status = JobStatus.RUNNING
            else:
                job_status = JobStatus.COMPLETED

            # Create job
            try:
                job = self.job_store.create_job(
                    job_type="agent_action",
                    payload={
                        "agent": agent,
                        "action": action,
                        "legacy_execution": True
                    },
                    assigned_to=agent,
                    tags=["migrated", "legacy"]
                )

                # Update with historical data
                updates = {
                    "status": job_status.value,
                }

                if "start_time" in execution:
                    updates["started_at"] = execution["start_time"]

                if "end_time" in execution:
                    updates["completed_at"] = execution["end_time"]

                if "exit_code" in execution:
                    updates["exit_code"] = execution["exit_code"]

                if "error" in execution:
                    updates["error_message"] = execution["error"]

                self.job_store.update_job(job.id, **updates)
                migrated += 1

            except Exception as e:
                click.echo(f"Failed to migrate execution {agent}/{action}: {e}", err=True)

        return migrated

    def migrate_pending_notes(self) -> int:
        """
        Migrate pending note updates from pending-notes.json.

        Returns:
            Number of pending notes migrated
        """
        pending_file = self.state_dir / "pending-notes.json"

        if not pending_file.exists():
            click.echo(f"No pending-notes.json found at {pending_file}")
            return 0

        with open(pending_file) as f:
            data = json.load(f)

        migrated = 0

        for note_path, updates in data.items():
            # Create a job to apply these updates
            try:
                job = self.job_store.create_job(
                    job_type="apply_note_updates",
                    payload={
                        "note_path": note_path,
                        "updates": updates,
                        "legacy_pending": True
                    },
                    assigned_to="assistant",
                    tags=["migrated", "pending_update"]
                )
                migrated += 1

            except Exception as e:
                click.echo(f"Failed to migrate pending note {note_path}: {e}", err=True)

        return migrated

    def import_agent_definitions(self) -> int:
        """
        Import agent definitions from markdown files.

        Returns:
            Number of agents imported
        """
        agents_dir = self.instance_root / "agents"

        if not agents_dir.exists():
            click.echo(f"No agents directory found at {agents_dir}")
            return 0

        imported = 0

        for agent_file in agents_dir.glob("*.md"):
            try:
                # Parse frontmatter to extract agent metadata
                with open(agent_file) as f:
                    content = f.read()

                # Simple frontmatter parsing
                if content.startswith("---"):
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        # Parse YAML frontmatter (simple approach)
                        frontmatter = parts[1]
                        agent_id = agent_file.stem

                        # Try to extract basic info
                        name_line = [l for l in frontmatter.split('\n') if 'name:' in l.lower()]
                        role_line = [l for l in frontmatter.split('\n') if 'role:' in l.lower()]

                        display_name = name_line[0].split(':', 1)[1].strip() if name_line else agent_id
                        description = role_line[0].split(':', 1)[1].strip() if role_line else ""

                        # Upsert agent
                        self.job_store.client.table("agents").upsert({
                            "id": agent_id,
                            "display_name": display_name,
                            "description": description,
                            "is_active": True
                        }).execute()

                        imported += 1

            except Exception as e:
                click.echo(f"Failed to import agent {agent_file}: {e}", err=True)

        return imported

    def create_initial_daily_note_states(self, days: int = 7) -> int:
        """
        Create initial state entries for recent daily notes.

        Args:
            days: Number of recent days to scan

        Returns:
            Number of notes indexed
        """
        vault_path = Path(os.environ.get("PERSONA_VAULT_PATH", Path.home() / "vault"))
        daily_notes_dir = vault_path / "Resources/Agenda/Daily"

        if not daily_notes_dir.exists():
            click.echo(f"No daily notes directory found at {daily_notes_dir}")
            return 0

        from persona.core.note_state import NoteStateStore
        note_store = NoteStateStore(self.job_store.client)

        indexed = 0

        # Get recent daily notes
        for note_file in sorted(daily_notes_dir.glob("*.md"), reverse=True)[:days]:
            try:
                with open(note_file) as f:
                    content = f.read()

                # Save initial state
                note_store.save_state(
                    note_path=str(note_file),
                    content=content,
                    parsed={"migrated": True, "initial_scan": True}
                )

                indexed += 1

            except Exception as e:
                click.echo(f"Failed to index {note_file}: {e}", err=True)

        return indexed


@click.group()
def cli():
    """Persona migration tool."""
    pass


@cli.command()
@click.option('--persona-root', '-p', type=click.Path(exists=True),
              default=None, help='Persona root directory')
@click.option('--dry-run', is_flag=True, help='Show what would be migrated')
def migrate_all(persona_root, dry_run):
    """Migrate all existing state to Supabase."""
    if not persona_root:
        persona_root = os.environ.get("PERSONA_ROOT")
        if not persona_root:
            click.echo("Error: PERSONA_ROOT not set and --persona-root not provided", err=True)
            return

    persona_root = Path(persona_root)
    migrator = StateMigrator(persona_root)

    if dry_run:
        click.echo("DRY RUN - No changes will be made")

    click.echo("Migrating Persona state to Supabase...")
    click.echo(f"Persona root: {persona_root}")
    click.echo()

    # Migrate executions
    click.echo("Migrating execution history...")
    if not dry_run:
        count = migrator.migrate_executions()
        click.echo(f"  Migrated {count} executions")
    else:
        click.echo("  Would migrate executions from executions.json")

    # Migrate pending notes
    click.echo("Migrating pending note updates...")
    if not dry_run:
        count = migrator.migrate_pending_notes()
        click.echo(f"  Migrated {count} pending updates")
    else:
        click.echo("  Would migrate pending updates from pending-notes.json")

    # Import agents
    click.echo("Importing agent definitions...")
    if not dry_run:
        count = migrator.import_agent_definitions()
        click.echo(f"  Imported {count} agents")
    else:
        click.echo("  Would import agents from agents/*.md")

    # Index recent daily notes
    click.echo("Indexing recent daily notes...")
    if not dry_run:
        count = migrator.create_initial_daily_note_states(days=7)
        click.echo(f"  Indexed {count} daily notes")
    else:
        click.echo("  Would index last 7 daily notes")

    click.echo()
    click.echo("Migration complete!")


@cli.command()
@click.option('--persona-root', '-p', type=click.Path(exists=True),
              default=None, help='Persona root directory')
def executions(persona_root):
    """Migrate execution history only."""
    if not persona_root:
        persona_root = os.environ.get("PERSONA_ROOT")

    migrator = StateMigrator(Path(persona_root))
    count = migrator.migrate_executions()
    click.echo(f"Migrated {count} executions")


@cli.command()
@click.option('--persona-root', '-p', type=click.Path(exists=True),
              default=None, help='Persona root directory')
def agents(persona_root):
    """Import agent definitions only."""
    if not persona_root:
        persona_root = os.environ.get("PERSONA_ROOT")

    migrator = StateMigrator(Path(persona_root))
    count = migrator.import_agent_definitions()
    click.echo(f"Imported {count} agents")


if __name__ == '__main__':
    cli()
