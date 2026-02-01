#!/bin/bash
# Installation script for Persona Job Queue system

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "Persona Job Queue Installation"
echo "======================================"
echo ""

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not found"
    echo "Please install Python 3.10 or later"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Found Python $PYTHON_VERSION"

# Check for pip
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is required but not found"
    echo "Please install pip3"
    exit 1
fi

echo "✓ Found pip3"

# Install dependencies
echo ""
echo "Installing Python dependencies..."
pip3 install -e "$SCRIPT_DIR"

echo "✓ Dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo ""
    echo "Creating .env file from template..."
    cp "$SCRIPT_DIR/.env.template" "$SCRIPT_DIR/.env"
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit $SCRIPT_DIR/.env and set your Supabase credentials"
else
    echo "✓ .env file already exists"
fi

# Create logs directory
LOGS_DIR="$HOME/.persona/logs"
mkdir -p "$LOGS_DIR"
echo "✓ Created logs directory: $LOGS_DIR"

# Check if Supabase credentials are set
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"

    if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
        echo ""
        echo "⚠️  WARNING: Supabase URL not configured in .env"
        echo "Please edit $SCRIPT_DIR/.env and set your Supabase credentials"
    else
        echo "✓ Supabase URL configured"
    fi

    if [ -z "$SUPABASE_KEY" ] || [ "$SUPABASE_KEY" = "your-service-role-key-here" ]; then
        echo ""
        echo "⚠️  WARNING: Supabase key not configured in .env"
        echo "Please edit $SCRIPT_DIR/.env and set your service role key"
    else
        echo "✓ Supabase key configured"
    fi
fi

echo ""
echo "======================================"
echo "Installation Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure Supabase:"
echo "   - Create a Supabase project at https://supabase.com"
echo "   - Get your project URL and service role key"
echo "   - Edit $SCRIPT_DIR/.env with your credentials"
echo ""
echo "2. Set up database schema:"
echo "   - Open Supabase SQL editor"
echo "   - Copy and run the SQL from: $SCRIPT_DIR/schema.sql"
echo ""
echo "3. Configure paths in .env:"
echo "   - PERSONA_ROOT: Path to Projects/Persona"
echo "   - PERSONA_VAULT_PATH: Path to your Obsidian vault"
echo ""
echo "4. (Optional) Migrate existing data:"
echo "   persona-migrate migrate-all --persona-root /path/to/persona"
echo ""
echo "5. Start using the CLI:"
echo "   persona status"
echo "   persona jobs"
echo ""
echo "6. Start a worker:"
echo "   persona-worker"
echo ""
echo "For more information, see: $SCRIPT_DIR/README.md"
echo ""
