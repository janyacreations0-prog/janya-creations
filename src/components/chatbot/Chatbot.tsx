'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, X, Send, Trash2 } from 'lucide-react';
import { chatResponse } from '@/lib/chatbot/action';
import type { ChatProductResult } from '@/lib/chatbot/types';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  products?: ChatProductResult[];
}

const WELCOME: ChatMessage = {
  role: 'bot',
  text: 'Hi! I\u2019m the Janya Creations assistant. I can help you find products, check your order, or answer store questions.',
  products: [],
};

const SUGGESTIONS = [
  'Show me earrings under ₹1000',
  'Do you have gold plated chains?',
  'Where is my order?',
  'What is your shipping policy?',
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([WELCOME]);
    }
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, messages.length]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: panelRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await chatResponse(text);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: res.text, products: res.products || [] },
      ]);
    } catch {
      setError('Unable to reach the assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setError('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-700 transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div
          className="fixed bottom-20 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(70vh, 560px)' }}
          role="dialog"
          aria-label="Janya Creations chat assistant"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-rose-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <p className="text-sm font-bold leading-tight">Janya Assistant</p>
                <p className="text-[11px] text-rose-100">Online</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-rose-700/60 transition-colors"
              aria-label="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div ref={panelRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto bg-rose-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'bot' && m.products && m.products.length > 0 && (
                  <div className="space-y-2">
                    {m.products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2.5 shadow-sm hover:border-rose-200 hover:shadow transition-all"
                      >
                        {p.image && (
                          <img src={p.image} alt={p.title} className="w-12 h-12 object-cover rounded-lg" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-800 line-clamp-1">{p.title}</p>
                          <p className="text-xs font-bold text-rose-600 mt-0.5">
                            ₹{p.price.toLocaleString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="bg-white border border-gray-200 text-gray-500 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm w-fit shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:240ms]" />
                </span>
              </div>
            )}

            {error && <p className="text-xs text-rose-600">{error}</p>}
          </div>

          {messages.length <= 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-2 bg-gray-50">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-xs bg-white border border-gray-200 hover:border-rose-300 hover:text-rose-600 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 p-3 border-t border-gray-100"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              aria-label="Chat message"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
