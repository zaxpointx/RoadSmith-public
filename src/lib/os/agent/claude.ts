/**
 * The Claude-powered conversation loop (Messages API + our own tools).
 *
 * We host the loop ourselves rather than using a managed agent because every
 * tool is a database operation that must run inside our tenant and permission
 * boundary, replies are short SMS turns where latency matters, and the
 * grounding check has to sit between the model and the customer.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { AgentCtx, ToolResult } from './tools.ts'
import { runTool, toolsFor } from './tools.ts'
import { checkGrounding } from './grounding.ts'

export const AGENT_MODEL = process.env.ROADSMITH_AGENT_MODEL || 'claude-opus-5-5'
const EFFORT = (process.env.ROADSMITH_AGENT_EFFORT || 'low') as 'low' | 'medium' | 'high'
const MAX_STEPS = 8

export function claudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

type Client = Pick<Anthropic, 'beta'>
let clientFactory: () => Client = () => new Anthropic({ maxRetries: 2, timeout: 60_000 })
/** Tests inject a fake client. */
export function setClaudeClientFactory(f: () => Client) { clientFactory = f }

export interface ClaudeTurn {
  reply: string
  model: string
  inputTokens: number
  outputTokens: number
  grounding: { ok: boolean; issues: string[]; retried: boolean }
  refused?: boolean
}

export async function runClaudeTurn(a: AgentCtx, args: { system: string; history: Anthropic.Beta.BetaMessageParam[]; context: string }): Promise<ClaudeTurn> {
  const client = clientFactory()
  const tools: Anthropic.Beta.BetaTool[] = toolsFor(a.who.audience).map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }))
  const messages: Anthropic.Beta.BetaMessageParam[] = [...args.history, { role: 'system', content: args.context }]
  let evidence = `${args.system}\n${args.context}`
  let inputTokens = 0, outputTokens = 0, retried = false
  let model = AGENT_MODEL
  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.beta.messages.create({
      model: AGENT_MODEL,
      max_tokens: 8000,
      system: [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
      output_config: { effort: EFFORT },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })
    inputTokens += res.usage.input_tokens
    outputTokens += res.usage.output_tokens
    model = res.model
    if (res.stop_reason === 'refusal') {
      return { reply: '', model, inputTokens, outputTokens, grounding: { ok: true, issues: [], retried }, refused: true }
    }
    messages.push({ role: 'assistant', content: res.content })
    const toolUses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    if (res.stop_reason === 'tool_use' && toolUses.length) {
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const out: ToolResult = await runTool(a, tu.name, (tu.input ?? {}) as Record<string, unknown>)
        const text = JSON.stringify(out)
        evidence += `\n${text}`
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: text, is_error: !out.ok })
      }
      messages.push({ role: 'user', content: results })
      continue
    }
    if (res.stop_reason === 'pause_turn') continue
    const reply = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()
    const g = checkGrounding(reply, evidence)
    if (!g.ok && !retried) {
      retried = true
      messages.push({ role: 'system', content: `Your reply mentions ${g.issues.join(', ')}, which did not come from a tool result or the school information. Rewrite it using only verified details (call a tool if you need to). Do not apologise for this correction.` })
      continue
    }
    return { reply, model, inputTokens, outputTokens, grounding: { ...g, retried } }
  }
  return { reply: '', model, inputTokens, outputTokens, grounding: { ok: false, issues: ['step limit reached'], retried } }
}
