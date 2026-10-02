# SKILLGENOME

[![vitest](https://github.com/effecet/genome-evolve-dashboard/actions/workflows/vitest.yml/badge.svg)](https://github.com/effecet/genome-evolve-dashboard/actions/workflows/vitest.yml)
[![gitleaks](https://github.com/effecet/genome-evolve-dashboard/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/effecet/genome-evolve-dashboard/actions/workflows/gitleaks.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/Node-24-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Vitest](https://img.shields.io/badge/Vitest-5.x-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![React](https://img.shields.io/badge/React-CDN-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Mermaid](https://img.shields.io/badge/Mermaid-diagrams-FF3670?logo=mermaid&logoColor=white)](https://mermaid.js.org)

Personal skill genome tracker with auto-generated daily practice cycles.

## Architecture

```mermaid
graph TD
    subgraph Dashboard["React SPA (index.html)"]
        UI[Dashboard UI] --> CYCLE[Cycle Generator<br/>lib/generate-cycle.js]
        UI --> DATA[data/projects.json<br/>Skills + levels]
    end

    subgraph Algorithm["Blended Scoring"]
        CYCLE --> LVL[Level Weight<br/>Lower = priority]
        CYCLE --> STALE[Staleness<br/>Days since assessed]
        CYCLE --> HIST[History<br/>Less practiced = higher]
        CYCLE --> DIV[Diversity<br/>Max 2 per project]
    end

    subgraph Output["Daily Cycle"]
        LVL --> TOP5[Top 5 Skills]
        STALE --> TOP5
        HIST --> TOP5
        DIV --> TOP5
    end

    AI[Claude Code<br/>daily-cycle.json] -.->|Override if today's date| UI

    style Dashboard fill:#1e293b,stroke:#f97316,color:#fff
    style Algorithm fill:#1e293b,stroke:#22d3ee,color:#fff
    style Output fill:#1e293b,stroke:#a78bfa,color:#fff
```

## Quick Start

```bash
make install   # install test dependencies
make serve     # serve at localhost:8080
```

Open `index.html` in a browser (or use `make serve` for full functionality).

## How It Works

The dashboard auto-generates a daily 5-skill practice cycle using a **blended scoring algorithm**:

- **Level weight** — lower-level skills get priority (growth potential)
- **Staleness** — skills not assessed recently bubble up
- **History** — less-practiced skills score higher
- **Diversity** — max 2 skills per project to spread practice

If a Claude Code-generated `data/daily-cycle.json` exists with today's date, it takes priority (AI-curated). Otherwise, the client-side generator kicks in automatically on page load.

## Development

```bash
make test          # run tests
make test-watch    # watch mode
make test-coverage # with coverage report
```

## Project Structure

```
index.html           # React SPA (standalone, CDN dependencies)
lib/
  generate-cycle.js  # Cycle generation algorithm (UMD — browser + Node)
data/
  projects.json      # Source of truth: projects and skills
  session-log.json   # Auto-tracked activity feed
tests/
  generate-cycle.test.js  # Vitest tests (27 cases)
```

## Configuration

Cycle generation accepts options:

| Option | Default | Description |
|--------|---------|-------------|
| `date` | today | Reference date (YYYY-MM-DD) |
| `count` | 5 | Skills per cycle |
| `maxPerProject` | 2 | Diversity cap per project |
