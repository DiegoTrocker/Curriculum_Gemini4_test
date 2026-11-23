import { useEffect, useRef, useState } from 'react';
import { Send, Trash2, X } from 'lucide-react';
import type { ChatMessage, ChatMode, GitHubRepoItem } from '../types/portfolio.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';

interface GeminiChatDrawerProps {
  open: boolean;
  onClose: () => void;
  repos: GitHubRepoItem[];
}

const MODEL_MODES: Array<{ id: ChatMode; label: string; model: string; hint: string }> = [
  { id: 'general', label: 'Portfolio Guide', model: 'gemini-4-hydrogen', hint: 'General curriculum & project Q&A' },
  { id: 'fast', label: 'Fast Facts', model: 'gemini-3.1-flash-lite', hint: 'Low-latency concise answers' },
  { id: 'interactive', label: 'Code & 3D Reviewer', model: 'gemini-4-neon', hint: 'Complex interactive code & WebGL' },
  { id: 'deep-reasoning', label: 'Systems Architect', model: 'gemini-4-carbon', hint: 'Deep architectural reasoning' },
];

const STARTER_PROMPTS = [
  'Summarize my academic background and internship impact.',
  'How are the Three.js 3D lab viewports optimized for performance?',
  'Suggest improvements for my self-hosted developer tools showcase.',
];

export function GeminiChatDrawer({ open, onClose, repos }: GeminiChatDrawerProps) {
  const [mode, setMode] = useState<ChatMode>('general');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content:
        'Hello. Ask me anything about the curriculum milestones, internships, live GitHub repositories, Three.js shader architecture, or technical documentation.',
      modelUsed: 'gemini-4-hydrogen',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  if (!open) return null;

  const activeConfig = MODEL_MODES.find((m) => m.id === mode) ?? MODEL_MODES[0];

  const sendMessageText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);
    setError(null);

    const repoSummary = repos
      .slice(0, 8)
      .map((r) => `- ${r.name} (${r.language || 'Mixed'}, ★${r.stargazers_count}): ${r.description || 'No description'}`)
      .join('\n');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          messages: nextHistory.filter((m) => m.id !== 'welcome-1'),
          repoSummary,
        }),
      });
      const data = (await res.json()) as { reply?: string; modelUsed?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error || 'Assistant request failed.');
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            content: data.reply!,
            modelUsed: data.modelUsed ?? activeConfig.model,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      setError('Network error while contacting Gemini assistant.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessageText(input);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/60"
      role="dialog"
      aria-modal="true"
      aria-label="Gemini Engineering Assistant"
    >
      <div className="flex h-full w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="font-mono text-xs text-blue-600 dark:text-blue-400">
              {activeConfig.model}
            </p>
            <h2 className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Engineering Portfolio Assistant
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    id: 'welcome-1',
                    role: 'model',
                    content: 'Conversation cleared. Ready for your next technical or curriculum question.',
                    modelUsed: activeConfig.model,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ])
              }
              aria-label="Clear chat history"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Task Role / Model Selector */}
        <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="grid grid-cols-2 gap-1.5">
            {MODEL_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  mode === m.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
                }`}
              >
                <p className="text-xs font-semibold">{m.label}</p>
                <p className={`font-mono text-[10px] ${mode === m.id ? 'text-blue-100' : 'text-zinc-500'}`}>
                  {m.model}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Multi-Turn Conversation Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-zinc-950 text-white dark:bg-blue-600'
                    : 'border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
              </div>
              <span className="mt-1 font-mono text-[10px] text-zinc-400">
                {msg.role === 'user' ? 'You' : msg.modelUsed} · {msg.timestamp}
              </span>
            </div>
          ))}

          {sending && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              Thinking with {activeConfig.model}...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Quick Prompts + Composer */}
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
            {STARTER_PROMPTS.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => void sendMessageText(sp)}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                {sp}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${activeConfig.label}...`}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
