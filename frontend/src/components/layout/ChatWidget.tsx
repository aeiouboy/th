'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ChatBubble } from './ChatBubble';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  suggestedActions?: string[];
}

interface BotResponse {
  type: 'message' | 'card';
  text: string;
  suggestedActions?: string[];
}

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  text: 'สวัสดีค่ะ! ฉันช่วยเรื่องการกรอกเวลาได้ค่ะ ลองพิมพ์ "กรอก 4 ชม. [รหัส Charge Code] วันนี้" หรือถาม "วันนี้กรอกไปกี่ชั่วโมงแล้ว?"',
  isUser: false,
  suggestedActions: [
    'แสดง Timesheet สัปดาห์นี้',
    'วันนี้กรอกไปกี่ชั่วโมงแล้ว?',
    'ฉันมี Charge Code อะไรบ้าง?',
  ],
};

const STORAGE_KEY = 'chat-widget-messages';

function loadMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [WELCOME_MSG];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ChatMessage[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [WELCOME_MSG];
}

export function ChatWidget() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      // Keep last 50 messages to avoid bloating localStorage
      const toSave = messages.slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const response = await api.post<BotResponse>('/integrations/teams/message', { text: text.trim() });
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: response.text,
        isUser: false,
        suggestedActions: response.suggestedActions,
      };
      setMessages((prev) => [...prev, botMsg]);

      // If bot logged time successfully, refetch timesheet data
      if (response.text.includes('เรียบร้อย') || response.text.includes('Logged')) {
        queryClient.invalidateQueries({ queryKey: ['timesheet'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: 'ขออภัยค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ',
          isUser: false,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleActionClick = (action: string) => {
    sendMessage(action);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full
            bg-[var(--accent-teal)] text-white shadow-lg
            hover:shadow-xl hover:scale-105 transition-all duration-200
            flex items-center justify-center cursor-pointer"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50
          w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)]
          flex flex-col rounded-2xl shadow-2xl border border-[var(--border-default)]
          bg-[var(--bg-card)] overflow-hidden
          animate-in slide-in-from-bottom-4 fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--accent-teal)]">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-5 h-5 text-white" />
              <div>
                <p className="text-sm font-semibold text-white">ผู้ช่วย Timesheet</p>
                <p className="text-[10px] text-white/70">กรอกเวลา, ตรวจสอบสถานะ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                text={msg.text}
                isUser={msg.isUser}
                suggestedActions={msg.suggestedActions}
                onActionClick={handleActionClick}
              />
            ))}
            {sending && (
              <div className="flex justify-start mb-3">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-stone-100 dark:bg-stone-800">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[var(--border-default)] bg-[var(--bg-card)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                disabled={sending}
                className="flex-1 px-3.5 py-2 rounded-xl text-sm
                  bg-stone-100 dark:bg-stone-800
                  text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
                  border border-transparent focus:border-[var(--accent-teal)]
                  focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="p-2 rounded-xl bg-[var(--accent-teal)] text-white
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-[var(--accent-teal)]/90 transition-colors cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
