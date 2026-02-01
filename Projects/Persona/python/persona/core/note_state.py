"""Daily note state management for diff tracking."""

import hashlib
from datetime import datetime, timezone
from typing import Optional
from supabase import Client


class NoteStateStore:
    """
    Manages daily note state in Supabase for diff detection.

    Tracks content hashes and parsed data to detect changes in daily notes
    without re-processing unchanged content.
    """

    def __init__(self, client: Client):
        """
        Initialize NoteStateStore.

        Args:
            client: Supabase client instance
        """
        self.client = client

    def get_state(self, note_path: str) -> Optional[dict]:
        """
        Get stored state for a daily note.

        Args:
            note_path: Path to the daily note

        Returns:
            State dict if found, None otherwise
        """
        result = self.client.table("daily_note_state").select("*").eq(
            "note_path", note_path
        ).execute()
        return result.data[0] if result.data else None

    def save_state(
        self,
        note_path: str,
        content: str,
        parsed: dict
    ):
        """
        Save state for a daily note.

        Args:
            note_path: Path to the daily note
            content: Full content of the note
            parsed: Parsed data (questions, tasks, etc.)
        """
        content_hash = self._hash_content(content)

        self.client.table("daily_note_state").upsert({
            "note_path": note_path,
            "content_hash": content_hash,
            "last_scanned": datetime.now(timezone.utc).isoformat(),
            "last_content": content,
            "parsed_data": parsed
        }).execute()

    def has_changed(self, note_path: str, content: str) -> bool:
        """
        Check if a note has changed since last scan.

        Args:
            note_path: Path to the daily note
            content: Current content of the note

        Returns:
            True if content has changed, False otherwise
        """
        state = self.get_state(note_path)
        if not state:
            return True

        current_hash = self._hash_content(content)
        return current_hash != state["content_hash"]

    def get_diff(self, note_path: str, new_content: str) -> dict:
        """
        Get diff between stored and new content.

        Args:
            note_path: Path to the daily note
            new_content: New content to compare

        Returns:
            Dict with 'added' and 'removed' parsed items
        """
        state = self.get_state(note_path)
        if not state:
            return {"added": [], "removed": []}

        old_parsed = state.get("parsed_data", {})
        # Note: Caller should parse new_content and compare
        # This is a placeholder for the structure
        return {
            "old_parsed": old_parsed,
            "has_changed": self.has_changed(note_path, new_content)
        }

    def _hash_content(self, content: str) -> str:
        """Generate SHA-256 hash of content."""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def delete_state(self, note_path: str):
        """
        Delete state for a note (e.g., if note is deleted).

        Args:
            note_path: Path to the daily note
        """
        self.client.table("daily_note_state").delete().eq(
            "note_path", note_path
        ).execute()

    def get_all_tracked_notes(self) -> list[dict]:
        """
        Get all tracked notes.

        Returns:
            List of state dicts for all tracked notes
        """
        result = self.client.table("daily_note_state").select("*").execute()
        return result.data
