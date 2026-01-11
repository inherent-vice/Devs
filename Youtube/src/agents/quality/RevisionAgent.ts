/**
 * Revision Agent
 *
 * Applies revisions based on critic and art evaluator feedback.
 * Uses Gemini 3 Flash for efficient content modification.
 */

import { z } from 'zod';
import { BaseAgent } from '../base/BaseAgent.js';
import { gemini3Flash } from '../../genkit.config.js';
import type { AgentContext, AgentResult } from '../base/types.js';
import type { CriticAgentOutput } from './CriticAgent.js';
import type { ArtEvaluatorOutput } from './ArtEvaluator.js';

// ===========================================
// Input/Output Schemas
// ===========================================

export const RevisionAgentInputSchema = z.object({
  originalScript: z.object({
    title: z.string(),
    hook: z.string(),
    sections: z.array(z.object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      duration: z.number(),
      visualNotes: z.string().optional(),
    })),
    callToAction: z.string(),
    fullText: z.string(),
    keywords: z.array(z.string()),
  }),
  originalStoryboard: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      description: z.string(),
      prompt: z.string(),
      duration: z.number(),
      priority: z.string(),
      visualStyle: z.string().optional(),
    })),
    style: z.string().optional(),
  }),
  criticFeedback: z.object({
    overallScore: z.number(),
    dimensions: z.any(),
    criticalIssues: z.array(z.object({
      dimension: z.string(),
      description: z.string(),
      suggestion: z.string(),
    })),
    revisionPriorities: z.array(z.object({
      priority: z.number(),
      dimension: z.string(),
      issue: z.string(),
      effort: z.string(),
      impact: z.string(),
    })),
  }),
  artFeedback: z.object({
    artisticScore: z.number(),
    visualIdentity: z.any(),
    storyboardAnalysis: z.any(),
    creativeDirections: z.array(z.object({
      aspect: z.string(),
      currentState: z.string(),
      recommendation: z.string(),
      priority: z.string(),
    })),
  }).optional(),
  iteration: z.number(),
  focusAreas: z.array(z.string()).optional(),
});

export type RevisionAgentInput = z.infer<typeof RevisionAgentInputSchema>;

export const RevisionAgentOutputSchema = z.object({
  revisedScript: z.object({
    title: z.string(),
    hook: z.string(),
    sections: z.array(z.object({
      id: z.string(),
      type: z.string(),
      content: z.string(),
      duration: z.number(),
      visualNotes: z.string().optional(),
      revised: z.boolean(),
      revisionNote: z.string().optional(),
    })),
    callToAction: z.string(),
    fullText: z.string(),
    keywords: z.array(z.string()),
  }),
  revisedStoryboard: z.object({
    scenes: z.array(z.object({
      id: z.string(),
      description: z.string(),
      prompt: z.string(),
      duration: z.number(),
      priority: z.string(),
      visualStyle: z.string().optional(),
      revised: z.boolean(),
      revisionNote: z.string().optional(),
    })),
    style: z.string().optional(),
  }),
  changes: z.array(z.object({
    type: z.enum(['script', 'storyboard', 'title', 'hook', 'cta']),
    location: z.string(),
    original: z.string(),
    revised: z.string(),
    reason: z.string(),
  })),
  addressedIssues: z.array(z.string()),
  remainingIssues: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1),
  summary: z.string(),
});

export type RevisionAgentOutput = z.infer<typeof RevisionAgentOutputSchema>;

// ===========================================
// Revision Agent Class
// ===========================================

export class RevisionAgent extends BaseAgent<RevisionAgentInput, RevisionAgentOutput> {
  readonly name = 'revision-agent';
  readonly description = 'Applies revisions based on quality feedback';

  protected readonly inputSchema = RevisionAgentInputSchema as any;
  protected readonly outputSchema = RevisionAgentOutputSchema as any;

  // Uses Gemini 3 Flash for efficient revisions
  protected model = gemini3Flash;
  protected temperature = 0.6;
  protected maxOutputTokens = 32768;

  protected readonly systemPrompt = `You are an expert content editor who improves YouTube content based on feedback.

Your revision approach:
1. Prioritize critical issues first
2. Make targeted, precise changes
3. Preserve what's working well
4. Track all changes made
5. Validate improvements address feedback

REVISION PRINCIPLES:

1. HOOK IMPROVEMENTS
   - Strengthen opening impact
   - Create stronger curiosity gap
   - Add pattern interrupts

2. NARRATIVE FIXES
   - Improve story flow
   - Strengthen emotional beats
   - Clarify messaging

3. ENGAGEMENT OPTIMIZATION
   - Add retention hooks
   - Improve pacing
   - Enhance shareability

4. VISUAL DIRECTIONS
   - Improve scene prompts for AI generation
   - Strengthen visual consistency
   - Add specific visual details

5. ETHICAL COMPLIANCE
   - Verify factual accuracy
   - Remove any problematic content
   - Ensure transparency

RULES:
- Only change what needs changing
- Keep changes focused and purposeful
- Maintain original voice and style
- Document every change with reasoning`;

  /**
   * Build revision prompt
   */
  protected buildPrompt(input: RevisionAgentInput, context: AgentContext): string {
    const criticalIssues = input.criticFeedback.criticalIssues
      .map(i => `- [${i.dimension}] ${i.description}\n  Suggestion: ${i.suggestion}`)
      .join('\n');

    const topPriorities = input.criticFeedback.revisionPriorities
      .slice(0, 5)
      .map(p => `${p.priority}. [${p.dimension}] ${p.issue} (Effort: ${p.effort}, Impact: ${p.impact})`)
      .join('\n');

    const artDirections = input.artFeedback?.creativeDirections
      .filter(d => d.priority === 'high')
      .map(d => `- ${d.aspect}: ${d.recommendation}`)
      .join('\n') || 'No art feedback provided';

    const focusContext = input.focusAreas?.length
      ? `\n\nFOCUS AREAS: ${input.focusAreas.join(', ')}`
      : '';

    return `Revise this content to address the feedback. This is iteration ${input.iteration}.

CURRENT SCORE: ${input.criticFeedback.overallScore.toFixed(2)}
TARGET SCORE: 0.85+

CRITICAL ISSUES TO FIX:
${criticalIssues}

TOP REVISION PRIORITIES:
${topPriorities}

ART DIRECTION FEEDBACK:
${artDirections}
${focusContext}

ORIGINAL SCRIPT:
Title: ${input.originalScript.title}
Hook: ${input.originalScript.hook}

Sections:
${input.originalScript.sections.map(s => `[${s.type}] ${s.content}`).join('\n\n')}

CTA: ${input.originalScript.callToAction}

ORIGINAL STORYBOARD (${input.originalStoryboard.scenes.length} scenes):
${input.originalStoryboard.scenes.map(s => `${s.id} [${s.priority}]: ${s.prompt}`).join('\n')}

Provide:
1. Revised script with improved sections marked
2. Revised storyboard with better prompts
3. Detailed change log with reasoning
4. List of issues addressed vs remaining
5. Confidence score for this revision
6. Summary of improvements`;
  }

  /**
   * Post-process to ensure changes are tracked
   */
  protected async postProcess(
    output: RevisionAgentOutput,
    input: RevisionAgentInput
  ): Promise<RevisionAgentOutput> {
    // Rebuild full text from sections
    output.revisedScript.fullText = output.revisedScript.sections
      .map(s => s.content)
      .join(' ');

    // Count revised sections
    const revisedSections = output.revisedScript.sections.filter(s => s.revised).length;
    const revisedScenes = output.revisedStoryboard.scenes.filter(s => s.revised).length;

    console.log(`[RevisionAgent] Revised ${revisedSections} sections and ${revisedScenes} scenes`);

    return output;
  }

  /**
   * Validate that critical issues were addressed
   */
  validateRevision(
    input: RevisionAgentInput,
    output: RevisionAgentOutput
  ): { valid: boolean; unaddressed: string[] } {
    const criticalIssues = input.criticFeedback.criticalIssues.map(i => i.description);
    const addressed = new Set(output.addressedIssues);

    const unaddressed = criticalIssues.filter(issue => {
      // Check if any addressed issue mentions this critical issue
      return !Array.from(addressed).some(a =>
        a.toLowerCase().includes(issue.toLowerCase().substring(0, 20))
      );
    });

    return {
      valid: unaddressed.length === 0,
      unaddressed,
    };
  }

  /**
   * Get change summary statistics
   */
  getChangeStats(output: RevisionAgentOutput): {
    scriptChanges: number;
    storyboardChanges: number;
    majorChanges: number;
    minorChanges: number;
  } {
    const scriptChanges = output.changes.filter(c =>
      ['script', 'title', 'hook', 'cta'].includes(c.type)
    ).length;

    const storyboardChanges = output.changes.filter(c =>
      c.type === 'storyboard'
    ).length;

    // Major changes: more than 50% of content changed
    const majorChanges = output.changes.filter(c =>
      c.revised.length > c.original.length * 0.5 ||
      c.original.length > c.revised.length * 0.5
    ).length;

    return {
      scriptChanges,
      storyboardChanges,
      majorChanges,
      minorChanges: output.changes.length - majorChanges,
    };
  }
}

// ===========================================
// Factory Export
// ===========================================

export const revisionAgent = new RevisionAgent();
