# OpenSpec and Future Architecture

## Overview

This document explains how OpenSpec (Open Agent Specification) fits into Persona's architecture and our roadmap for adopting it.

## What is OpenSpec?

**OpenSpec** refers to Oracle's **Open Agent Specification** - a framework-agnostic declarative language for defining complete agentic systems. Think of it as ONNX for AI agents: define once, run anywhere.

### Key Differences from AGENTS.md

| Aspect | AGENTS.md | Open Agent Spec |
|--------|-----------|-----------------|
| Purpose | Project instructions | Complete agent architecture |
| Format | Free-form Markdown | Structured JSON/YAML |
| Scope | Documentation | Executable definitions |
| Portability | Cross-tool instructions | Cross-runtime execution |
| Maturity | Industry standard | Emerging (Oracle-led) |

**AGENTS.md** tells AI tools *how to work with a project*.
**Open Agent Spec** defines *what the agent is and how it behaves*.

## Current Architecture: Provider Abstraction

Today, Persona uses a **shell-level provider abstraction**:

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTS.md Layer                          │
│  (Cross-platform documentation for AI tools)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    providers.sh                             │
│  get_provider() → get_provider_path() → invoke_provider()   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         ┌────────┐     ┌─────────┐     ┌─────────┐
         │ Claude │     │ Gemini  │     │  Jules  │
         │  CLI   │     │   CLI   │     │   CLI   │
         └────────┘     └─────────┘     └─────────┘
```

### What This Provides

- **Provider switching** via configuration
- **Agent-level overrides** in frontmatter
- **Model mapping** between providers
- **Backward compatibility** with existing workflows

### What This Doesn't Provide

- Structured agent definitions (beyond YAML frontmatter)
- Runtime portability (agents still tied to Persona)
- Agent-to-agent interoperability standards
- Framework independence

## Future Architecture: OpenSpec Integration

### Phase 1: Current State (Implemented)

```
Agent Definition (Markdown + YAML)
         │
         ▼
    providers.sh (Shell abstraction)
         │
         ▼
    Provider CLIs (Claude, Gemini, Jules)
```

### Phase 2: TypeScript Provider Layer (Planned)

```
Agent Definition (Markdown + YAML)
         │
         ▼
    IProvider Interface (TypeScript)
         │
    ┌────┴────┬────────────┬─────────────┐
    ▼         ▼            ▼             ▼
ClaudeAdapter GeminiAdapter JulesAdapter CustomAdapter
    │         │            │             │
    ▼         ▼            ▼             ▼
  Claude    Gemini      Jules        Custom
   CLI       CLI         CLI          API
```

**Benefits:**
- Type-safe provider implementations
- Plugin UI for provider selection
- Better error handling
- Async execution support

### Phase 3: Open Agent Spec Adoption (Future)

```
┌─────────────────────────────────────────────────────────────┐
│              Open Agent Spec Definition                      │
│  (Structured YAML/JSON agent definition)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent Spec Runtime Adapter                      │
│  (Translates spec to provider-specific execution)           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         ┌────────┐     ┌─────────┐     ┌─────────┐
         │LangGraph│    │ CrewAI  │     │ AutoGen │
         └────────┘     └─────────┘     └─────────┘
```

**Benefits:**
- Execute agents on any compatible runtime
- Standardized agent definitions
- Framework independence
- Broader ecosystem compatibility

## Open Agent Spec Components

### Agents

Conversational agents or agent components:

```python
from pyagentspec.agent import Agent
from pyagentspec.property import Property

agent = Agent(
    name="Persona Researcher",
    system_prompt="You are a research analyst...",
    llm_config=llm_config,
    inputs=[Property(json_schema={"title": "query", "type": "string"})]
)
```

### Flows

Structured, workflow-based processes:

```yaml
flows:
  - name: research-workflow
    nodes:
      - type: LLMNode
        name: analyze
        prompt: "Analyze the research question..."
      - type: ToolNode
        name: search
        tool: web_search
    edges:
      - from: analyze
        to: search
        type: data
```

### Tools

External integrations:

```yaml
tools:
  - name: web_search
    type: function
    parameters:
      query: { type: string }
  - name: file_read
    type: function
    parameters:
      path: { type: string }
```

## A2A Protocol Integration

**A2A (Agent2Agent)** is Google's protocol for agent-to-agent communication. It complements Open Agent Spec by providing:

- **Agent Discovery**: Find agents and their capabilities
- **Task Communication**: Send tasks between agents
- **Capability Advertising**: Publish what an agent can do

### Current Inter-Agent Communication

```
┌──────────┐    JSON file    ┌──────────┐
│  Agent A │ ───────────────▶│  Agent B │
│          │  inbox/outbox   │          │
└──────────┘                 └──────────┘
```

### Future A2A Communication

```
┌──────────┐    A2A Protocol   ┌──────────┐
│  Agent A │ ◀───────────────▶ │  Agent B │
│          │  HTTP/JSON-RPC    │          │
└──────────┘                   └──────────┘
       │                             │
       ▼                             ▼
  Agent Card                    Agent Card
  (capabilities)                (capabilities)
```

## Migration Path

### Step 1: Current (Shell Abstraction)

- Use AGENTS.md for documentation
- Use providers.sh for provider switching
- Keep existing Markdown agent definitions

### Step 2: TypeScript Provider Layer

- Create `IProvider` interface
- Implement provider adapters
- Add provider selection UI to plugin

### Step 3: Hybrid Agent Definitions

- Support both Markdown and Agent Spec formats
- Gradual migration of agent definitions
- Maintain backward compatibility

### Step 4: Full Agent Spec Adoption

- Convert all agents to Agent Spec format
- Enable cross-runtime execution
- Implement A2A protocol

## Related Standards

### MCP (Model Context Protocol)

Anthropic's standard for AI-to-tool connections:
- Provides secure, bi-directional tool access
- Already supported by Claude Code and Gemini
- Complements Agent Spec for resource access

### Agent Cards

A2A's agent discovery mechanism:
```json
{
  "name": "Persona Researcher",
  "description": "Research and analysis agent",
  "url": "https://persona.local/agents/researcher",
  "skills": [
    {"name": "web_research", "description": "Search and analyze web content"},
    {"name": "file_analysis", "description": "Read and summarize files"}
  ]
}
```

## Roadmap Timeline

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Shell provider abstraction | Complete |
| Phase 2 | AGENTS.md adoption | Complete |
| Phase 2.5 | TypeScript provider layer | Planned |
| Phase 3 | Open Agent Spec evaluation | Future |
| Phase 4 | A2A protocol integration | Future |

## Benefits of Full OpenSpec Adoption

1. **Portability**: Run Persona agents on LangGraph, CrewAI, AutoGen
2. **Standardization**: Industry-standard agent definitions
3. **Interoperability**: Communicate with external agents via A2A
4. **Ecosystem**: Access to growing Agent Spec tooling
5. **Future-proofing**: Aligned with emerging standards

## Current Limitations

1. **Agent Spec Maturity**: Still emerging, APIs may change
2. **Runtime Support**: Limited runtime adapters available
3. **Complexity**: More structured than current Markdown format
4. **Migration Effort**: Existing agents need conversion

## Recommendation

**Current approach**: Continue with shell abstraction and AGENTS.md for stability.

**Next step**: Implement TypeScript provider layer for better extensibility.

**Future**: Evaluate Agent Spec adoption when:
- More runtime adapters are available
- Standard stabilizes
- Clear migration path emerges

## References

- [Oracle Open Agent Specification](https://github.com/oracle/agent-spec)
- [PyAgentSpec Documentation](https://oracle.github.io/agent-spec/development/docs_home.html)
- [arXiv: Open Agent Specification Technical Report](https://arxiv.org/abs/2510.04173)
- [Google A2A Protocol](https://github.com/a2aproject/A2A)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [Anthropic MCP](https://modelcontextprotocol.io/)
