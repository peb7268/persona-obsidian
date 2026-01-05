#!/usr/bin/env bash
# providers.sh - AI Provider Abstraction Layer
#
# Provides a unified interface for different AI CLI tools.
# Source this file from run-agent.sh
#
# Supported providers:
# - claude: Claude Code CLI
# - gemini: Gemini CLI
# - jules: Jules Tools CLI

# Get provider from agent definition or env.md
# Usage: get_provider "/path/to/agent.md"
get_provider() {
    local agent_def="$1"
    local env_file="$PERSONA_ROOT/config/env.md"

    # Check agent-specific provider override in frontmatter
    if [ -f "$agent_def" ]; then
        local agent_provider=$(grep "^provider:" "$agent_def" 2>/dev/null | head -1 | cut -d: -f2 | xargs)
        if [ -n "$agent_provider" ]; then
            echo "$agent_provider"
            return
        fi
    fi

    # Fall back to global provider from env.md
    local global_provider=$(grep "^default_provider:" "$env_file" 2>/dev/null | cut -d: -f2 | xargs)

    echo "${global_provider:-claude}"
}

# Get provider-specific executable path
# Usage: get_provider_path "claude"
get_provider_path() {
    local provider="$1"
    local env_file="$PERSONA_ROOT/config/env.md"

    case "$provider" in
        claude)
            grep "^claude_path:" "$env_file" | cut -d: -f2- | xargs
            ;;
        gemini)
            local path=$(grep "^gemini_path:" "$env_file" | cut -d: -f2- | xargs)
            echo "${path:-gemini}"
            ;;
        jules)
            local path=$(grep "^jules_path:" "$env_file" | cut -d: -f2- | xargs)
            echo "${path:-jules}"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Map generic model name to provider-specific model
# Usage: get_provider_model "claude" "/path/to/agent.md"
get_provider_model() {
    local provider="$1"
    local agent_def="$2"

    # Read model from agent frontmatter
    local model=""
    if [ -f "$agent_def" ]; then
        model=$(grep "^model:" "$agent_def" 2>/dev/null | head -1 | cut -d: -f2 | xargs)
    fi

    # Map generic model names to provider-specific ones
    case "$provider" in
        claude)
            case "$model" in
                opus|4-opus|claude-opus) echo "opus" ;;
                sonnet|4-sonnet|claude-sonnet) echo "sonnet" ;;
                haiku|4-haiku|claude-haiku) echo "haiku" ;;
                *) echo "opus" ;;  # default
            esac
            ;;
        gemini)
            case "$model" in
                opus|pro|gemini-pro) echo "gemini-2.0-flash" ;;
                sonnet|flash|gemini-flash) echo "gemini-2.0-flash" ;;
                *) echo "gemini-2.0-flash" ;;
            esac
            ;;
        jules)
            echo "jules"  # Jules doesn't have model selection
            ;;
        *)
            echo "$model"
            ;;
    esac
}

# Execute prompt with provider
# Usage: invoke_provider "claude" "/path/to/claude" "opus" "$prompt" "$log_file" "$output_file"
invoke_provider() {
    local provider="$1"
    local provider_path="$2"
    local model="$3"
    local prompt="$4"
    local log_file="$5"
    local output_file="$6"

    case "$provider" in
        claude)
            echo "$prompt" | "$provider_path" \
                --print \
                --dangerously-skip-permissions \
                --model "$model" \
                2>&1 | tee -a "$log_file" "$output_file"
            ;;
        gemini)
            # Gemini CLI invocation
            # Gemini natively reads AGENTS.md files
            echo "$prompt" | "$provider_path" \
                --sandbox false \
                2>&1 | tee -a "$log_file" "$output_file"
            ;;
        jules)
            # Jules is async - creates a task and returns
            # For now, use synchronous mode if available
            local instance_path="${PERSONA_INSTANCE_PATH:-$(pwd)}"
            "$provider_path" task create \
                --description "$prompt" \
                --repo "$instance_path" \
                2>&1 | tee -a "$log_file" "$output_file"
            ;;
        *)
            echo "ERROR: Unknown provider: $provider" >&2
            return 1
            ;;
    esac
}

# Check if provider is available
# Usage: check_provider_available "claude" "/path/to/claude"
check_provider_available() {
    local provider="$1"
    local provider_path="$2"

    if [ -z "$provider_path" ]; then
        return 1
    fi

    if [ -x "$provider_path" ]; then
        return 0
    fi

    # Check if it's in PATH
    if command -v "$provider_path" &> /dev/null; then
        return 0
    fi

    return 1
}

# Get provider display name
# Usage: get_provider_name "claude"
get_provider_name() {
    local provider="$1"

    case "$provider" in
        claude) echo "Claude Code CLI" ;;
        gemini) echo "Gemini CLI" ;;
        jules) echo "Jules Tools CLI" ;;
        *) echo "$provider" ;;
    esac
}
