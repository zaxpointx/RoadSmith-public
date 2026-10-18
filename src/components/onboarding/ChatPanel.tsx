'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle,
  X,
  Check,
  Send,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────
const SURFACE = '#0F0F0F'
const BORDER = 'rgba(255,255,255,0.06)'
const TEXT_SECONDARY = '#9CA3AF'
const TEXT_MUTED = '#6B7280'
const ACCENT = '#4ADE80'
const GLASS_BG = 'rgba(255,255,255,0.04)'
const GLASS_BORDER = 'rgba(255,255,255,0.08)'
const GLASS_SHADOW = '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)'

export type OnboardingState =
  | 'started'
  | 'students_import'
  | 'instructors_added'
  | 'session_types_set'
  | 'complete'

interface Message {
  role: 'agent' | 'user'
  content: string
  id: string
}

interface ProgressMap {
  started: boolean
  students_import: boolean
  instructors_added: boolean
  session_types_set: boolean
  complete: boolean
}

const STEP_LABELS: { key: keyof ProgressMap; label: string }[] = [
  { key: 'started', label: 'Started' },
  { key: 'students_import', label: 'Students' },
  { key: 'instructors_added', label: 'Instructors' },
  { key: 'session_types_set', label: 'Session Types' },
  { key: 'complete', label: 'Complete' },
]

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressDots({ progress }: { progress: ProgressMap }) {
  const completed = Object.values(progress).filter(Boolean).length
  const total = Object.keys(progress).length

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      {/* Step pills */}
      {STEP_LABELS.map(({ key, label }) => {
        const done = progress[key]
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '999px',
              background: done ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${done ? 'rgba(74,222,128,0.25)' : GLASS_BORDER}`,
              fontSize: '10px',
              fontWeight: '600',
              color: done ? ACCENT : 'rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.3s',
            }}
          >
            {done ? <Check className="w-2.5 h-2.5" /> : <div className="w-2 h-2" style={{ borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />}
            <span className="progress-label">{label}</span>
          </div>
        )
      })}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: '10px', color: TEXT_MUTED, fontWeight: '500', whiteSpace: 'nowrap' }}>
        {completed}/{total}
      </span>
    </div>
  )
}

function AgentBubble({ content }: { content: string }) {
  // Split by double newlines to create paragraphs
  const paragraphs = content.split('\n\n')

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '12px',
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${ACCENT}, #22D3EE)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '2px',
      }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: '#000' }} />
      </div>

      {/* Bubble */}
      <div style={{
        background: GLASS_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: '16px',
        borderTopLeftRadius: '4px',
        padding: '12px 16px',
        maxWidth: '85%',
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#E5E7EB',
        fontFamily: 'Inter, sans-serif',
      }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ marginBottom: i < paragraphs.length - 1 ? '8px' : 0, whiteSpace: 'pre-wrap' }}>
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '12px',
    }}>
      <div style={{
        background: `rgba(74,222,128,0.1)`,
        border: `1px solid rgba(74,222,128,0.2)`,
        borderRadius: '16px',
        borderBottomRightRadius: '4px',
        padding: '10px 14px',
        maxWidth: '80%',
        fontSize: '13px',
        lineHeight: '1.5',
        color: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
      }}>
        {content}
      </div>
    </div>
  )
}

// ── Quick Reply Buttons ──────────────────────────────────────────────────────
function QuickReplies({
  suggestions,
  onSelect,
  loading,
}: {
  suggestions: string[]
  onSelect: (text: string) => void
  loading: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
      padding: '4px 0 8px',
    }}>
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${GLASS_BORDER}`,
            borderRadius: '999px',
            color: TEXT_SECONDARY,
            fontSize: '12px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.15s',
            opacity: loading ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            if (!loading) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.1)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,222,128,0.3)'
              ;(e.currentTarget as HTMLElement).style.color = ACCENT
            }
          }}
          onMouseLeave={e => {
            if (!loading) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              ;(e.currentTarget as HTMLElement).style.borderColor = GLASS_BORDER
              ;(e.currentTarget as HTMLElement).style.color = TEXT_SECONDARY
            }
          }}
        >
          {suggestion}
          <ArrowRight className="w-3 h-3" />
        </button>
      ))}
    </div>
  )
}

// ── Chat Panel (Floating) ────────────────────────────────────────────────────
interface ChatPanelProps {
  /** Initial onboarding state (from server/localStorage) */
  initialState?: OnboardingState
  /** Called when setup is complete and user clicks "Take me to dashboard" */
  onComplete?: () => void
  /** Called when user wants to open a specific page (import, instructors, etc.) */
  onNavigate?: (path: string) => void
}

export default function ChatPanel({
  initialState = 'started',
  onComplete,
  onNavigate,
}: ChatPanelProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentState, setCurrentState] = useState<OnboardingState>(initialState)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [progress, setProgress] = useState<ProgressMap>({
    started: false,
    students_import: false,
    instructors_added: false,
    session_types_set: false,
    complete: false,
  })
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, suggestions, scrollToBottom])

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboarding_agent_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        queueMicrotask(() => {
          setCurrentState(parsed.state || 'started')
          setProgress(parsed.progress || { started: false, students_import: false, instructors_added: false, session_types_set: false, complete: false })
          if (parsed.messages?.length > 0) setMessages(parsed.messages)
        })
        if (parsed.messages?.length > 0) return // Don't send initial greeting
      }
    } catch {}

    // No saved session — send initial greeting
    queueMicrotask(() => { void sendMessage('', 'started') })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('onboarding_agent_state', JSON.stringify({
      state: currentState,
      progress,
      messages: messages.slice(-50), // Keep last 50 messages
    }))
  }, [currentState, progress, messages])

  // Also sync state to server periodically
  useEffect(() => {
    if (currentState !== initialState) {
      fetch('/api/onboarding-agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: currentState }),
      }).catch(() => {})
    }
  }, [currentState, initialState])

  async function sendMessage(userMessage: string, overrideState?: string) {
    setLoading(true)

    try {
      const res = await fetch('/api/onboarding-agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentState: overrideState || currentState,
          userMessage,
          onboardingData: {},
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()

      setMessages(prev => [
        ...prev,
        { role: 'agent', content: data.response, id: generateId() },
      ])
      setCurrentState(data.state)
      setSuggestions(data.suggestions || [])
      setActions(data.actions || [])

      if (data.progress) {
        setProgress(data.progress)
      }

      // Handle "complete" state auto-actions
      if (data.state === 'complete' && data.actions?.includes('go_to_dashboard') && onComplete) {
        setTimeout(() => onComplete(), 1500)
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'agent',
          content: "Hmm, I had a hiccup. Can you try again?",
          id: generateId(),
        },
      ])
    }

    setLoading(false)
  }

  const handleQuickReply = useCallback((text: string) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text, id: generateId() },
    ])
    sendMessage(text)
  }, [sendMessage])

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || loading) return
    const text = inputValue.trim()
    setInputValue('')
    setMessages(prev => [
      ...prev,
      { role: 'user', content: text, id: generateId() },
    ])
    sendMessage(text)
  }, [inputValue, loading, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Handle action buttons
  useEffect(() => {
    if (actions.includes('go_to_dashboard') && onComplete) {
      onComplete()
    }
    if (actions.includes('open_import_page') && onNavigate) {
      onNavigate('/school-admin/import')
    }
    if (actions.includes('open_instructors_page') && onNavigate) {
      onNavigate('/school-admin/instructors')
    }
    if (actions.includes('open_session_types') && onNavigate) {
      onNavigate('/school-admin/sessions')
    }
  }, [actions, onComplete, onNavigate])

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${ACCENT}, #22D3EE)`,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(74,222,128,0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(74,222,128,0.4)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(74,222,128,0.3)'
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <X className="w-5 h-5" style={{ color: '#000' }} />
        ) : (
          <MessageCircle className="w-5 h-5" style={{ color: '#000' }} />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '92px',
            right: '24px',
            zIndex: 999,
            width: '380px',
            height: '520px',
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: '20px',
            boxShadow: GLASS_SHADOW,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 16px',
            borderBottom: `1px solid ${BORDER}`,
            background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${ACCENT}, #22D3EE)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#000' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>Setup Assistant</div>
              <div style={{ fontSize: '11px', color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: ACCENT }} />
                Active
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORDER}`,
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: TEXT_MUTED,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress */}
          <ProgressDots progress={progress} />

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: '#0A0A0A',
          }}>
            {messages.map((msg) => (
              msg.role === 'agent' ? (
                <AgentBubble key={msg.id} content={msg.content} />
              ) : (
                <UserBubble key={msg.id} content={msg.content} />
              )
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
                alignItems: 'center',
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${ACCENT}, #22D3EE)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: '#000' }} />
                </div>
                <div style={{
                  background: GLASS_BG,
                  border: `1px solid ${GLASS_BORDER}`,
                  borderRadius: '16px',
                  padding: '10px 14px',
                  display: 'flex',
                  gap: '4px',
                }}>
                  <div className="loading-dot" />
                  <div className="loading-dot" style={{ animationDelay: '0.2s' }} />
                  <div className="loading-dot" style={{ animationDelay: '0.4s' }} />
                </div>
                <style>{`
                  .loading-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: ${ACCENT};
                    animation: dotBounce 1.2s ease-in-out infinite;
                  }
                  @keyframes dotBounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                  }
                `}</style>
              </div>
            )}

            {/* Quick replies */}
            {!loading && suggestions.length > 0 && (
              <QuickReplies
                suggestions={suggestions}
                onSelect={handleQuickReply}
                loading={loading}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: `1px solid ${BORDER}`,
            background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={loading}
                style={{
                  flex: 1,
                  background: GLASS_BG,
                  border: `1px solid ${GLASS_BORDER}`,
                  borderRadius: '999px',
                  padding: '10px 14px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = `${ACCENT}66`)}
                onBlur={e => (e.target.style.borderColor = GLASS_BORDER)}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || loading}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: inputValue.trim() && !loading ? ACCENT : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  cursor: inputValue.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  opacity: inputValue.trim() && !loading ? 1 : 0.4,
                }}
              >
                <Send className="w-3.5 h-3.5" style={{ color: inputValue.trim() && !loading ? '#000' : TEXT_MUTED }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 640px) {
          .chat-panel-mobile {
            width: calc(100vw - 32px) !important;
            right: 16px !important;
            bottom: 88px !important;
            height: 60vh !important;
          }
        }
      `}</style>
    </>
  )
}
