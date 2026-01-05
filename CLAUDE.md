# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a personal knowledge management system built using Obsidian with a sophisticated organizational structure for notes, learning materials, project documentation, and daily workflows.

## Key Directory Structure

- **Resources/**: Main content organization hub
  - **Agenda/**: Time-based organization (Daily, Weekly, Monthly, Tasks)
  - **Learning/**: Educational content, books, articles, courses
  - **Professional/**: Work-related content, MCO project notes, blog drafts
  - **General/**: Templates, workflows, and shared utilities
  - **People/**: CRM-style person tracking
  - **Zettlekasten/**: Atomic notes and knowledge connections

- **Projects/**: Active project tracking
  - **Sales/**: Sales pipeline, prospects, campaigns
  - **Ecomms/**: Work project documentation
  - **Momentum/**: Personal projects

- **Archive/**: Historical content and completed items

## Obsidian Configuration

The vault uses extensive Obsidian plugins and configuration:

### Key Plugins in Use
- **Dataview**: Dynamic content queries and tables
- **Templater**: Template automation and dynamic content
- **QuickAdd**: Rapid content creation workflows
- **Journals**: Calendar and timeline views
- **Smart Connections**: AI-powered note linking
- **Gemini Scribe**: AI integration for content generation
- **Whisper**: Voice note transcription
- **Buttons**: Interactive navigation elements

### Templates System
Templates are located in `Resources/General/Templates/`:
- Daily note templates for consistent journaling
- Meeting note templates with CRM integration
- Sales prospect tracking templates
- Quick capture templates

## Workflow Systems

### Daily Note System
- Daily notes follow YYYY-MM-DD format
- Located in `Resources/Agenda/Daily/`
- Includes task tracking, meeting notes, and reflection
- Uses front matter for metadata (lifting, cardio tracking)

### Meeting Notes
Meeting notes follow a three-parameter system:
- Directory (e.g., Ad-Hoc, Leadership, Scrum)
- Type (e.g., Discussion, Planning, 1to1)
- Subject (e.g., MongoDB-RCA, AI-Strategy)

### Task Management
- High priority tasks use ⏫ emoji for visibility
- Tasks are tracked across multiple files and aggregated via Dataview
- Integration with external systems like TickTick

### Learning System
- Books tracked with reading priorities and shelves
- Learning curricula documented (e.g., Generative AI & Deep Learning)
- Spaced repetition system for retention
- LeetCode progress tracking via API integration

## Content Creation Patterns

### Note Types
1. **Fleeting Notes**: Quick captures for later processing
2. **Literature Notes**: Summaries of external content
3. **Permanent Notes**: Refined, connected knowledge
4. **Meeting Notes**: Structured meeting documentation
5. **Person Notes**: CRM-style contact management

### Linking Strategy
- Extensive use of WikiLinks `[[]]` for internal connections
- Tag-based categorization with hierarchical tags
- Backlink tracking for relationship discovery

## Automation Features

### Voice Integration
- Whisper plugin for voice-to-text transcription
- Recordings stored in `Resources/General/Whisper/`
- Integration with mobile capture workflows

### Data Integration
- LeetCode stats API integration for progress tracking
- Goodreads integration for book management
- External tool integration (Raycast, Gemini)

### Content Queries
Extensive use of Dataview queries for:
- Currently reading books display
- High priority task aggregation
- Recent file navigation
- Tag-based content filtering

## Mobile Workflow

The system is designed for cross-platform use:
- Mobile-friendly templates and shortcuts
- Voice capture integration
- Quick note creation via mobile apps
- Sync considerations for external tools

## Development Commands

Since this is not a traditional codebase, there are no build/test commands. However, useful operations include:

### Obsidian Operations
- Vault sync and backup
- Plugin updates and management
- Template deployment
- Graph analysis and cleanup

### Content Management
- Link validation and cleanup
- Orphaned note identification
- Tag hierarchy optimization
- Asset organization and optimization

## File Naming Conventions

- Daily notes: `YYYY-MM-DD.md`
- Meeting notes: `YYYY-MM-DD - Meeting Subject.md`
- Person notes: `First Last.md`
- Learning notes: Descriptive titles with consistent formatting
- Template notes: Prefixed with purpose (e.g., "Daily Template.md")

## Integration Points

### External Tools
- **Raycast**: Quick access and AI integration
- **TickTick**: Task management sync
- **Bitwarden**: Password management integration
- **Gemini**: AI-powered content generation
- **Kindle/Reader**: Reading note integration

### API Integrations
- LeetCode progress tracking
- External service webhooks
- Content import/export pipelines

This vault represents a sophisticated personal knowledge management system optimized for productivity, learning, and relationship management across both personal and professional contexts.