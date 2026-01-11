# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Agentic AI Workflow System - a multi-agent orchestration system that auto-generates YouTube videos using Genkit, Gemini 3, Veo 3.1, and Nano Banana Pro. The system produces content through three phases: Research (sequential), Production (parallel), and Quality (iterative loop).

## Development Commands

```bash
# Development
npm run dev                              # Start dev server with Genkit UI
npm run genkit:ui                        # Genkit Developer UI on :3000

# Testing
npm run test:agent <AgentName>           # Unit test single agent
npm run test:e2e -- --video-type=shorts  # E2E pipeline test
npm run benchmark:quality -- --samples=10

# Build
npm run build                            # TypeScript compilation
```

## Architecture

### Pipeline Flow
```
MasterFlow (Orchestrator)
  ├─ ResearchFlow (Sequential): TrendAgent → TopicAgent → ScriptAgent
  ├─ ProductionFlow (Parallel): VoiceAgent | VideoAgent | ThumbnailAgent → EditorAgent
  └─ QualityFlow (Loop): CriticAgent → ArtEvaluator → RevisionAgent (until score ≥ 0.85)
```

### Model Assignments
- **Gemini 3 Flash**: General agents (Research, Script, Editor, Revision, Publisher)
- **Gemini 3 Pro**: Quality evaluation (CriticAgent, ArtEvaluator) - requires lower temperature (0.3)
- **Veo 3.1**: Video generation (1080p, max 148s, native audio)
- **Nano Banana Pro**: 4K thumbnail generation

### Key Patterns
- All agents extend `BaseAgent<TInput, TOutput>` with Zod schema validation
- Session state managed via `SessionStore` with automatic checkpointing
- 5-dimensional quality evaluation: Technical (0.25), Narrative (0.25), Engagement (0.25), Originality (0.15), Ethical (0.10)
- Quality loop exits on: score ≥ 0.85, convergence < 2%, diminishing returns < 50%, or max 5 iterations

### Cost Optimization
- Use Veo Fast ($0.15/s) for B-roll, Standard ($0.40/s) for hero shots
- 8-second optimal clip duration for Veo 3.1
- Context caching saves ~90% tokens on system prompts

## Key Files

- `src/genkit.config.ts` - Genkit plugin setup and model exports
- `src/agents/base/BaseAgent.ts` - Generic agent class with retry/cost tracking
- `src/flows/MasterFlow.ts` - Main pipeline orchestrator
- `src/quality/QualityMetrics.ts` - 50+ metrics across 5 dimensions
- `docs/implementation-guide.md` - Complete 1800+ line specification

## Environment Variables

```bash
GOOGLE_AI_API_KEY          # Gemini 3 API key
GOOGLE_CLOUD_PROJECT       # Vertex AI project ID
GOOGLE_CLOUD_LOCATION      # us-central1
YOUTUBE_API_KEY            # YouTube Data API
MAX_COST_PER_VIDEO=30.00   # Cost limit per video
```
