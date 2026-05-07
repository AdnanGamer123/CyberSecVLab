import React, { useState, useRef, useEffect } from 'react';
import { askQA } from '../services/ai';
import { Send, X, Bot, User } from 'lucide-react';

interface AIChatProps {
  currentTopicContent?: string;
}

export function AIChat({ currentTopicContent }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'مرحباً بك في مختبر الأمن السيبراني! أنا المساعد الذكي، كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    const aiResponse = await askQA(userText, currentTopicContent);
    
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-50"
          aria-label="Open AI Assistant"
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans">
          {/* Header */}
          <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Bot className="text-emerald-400" size={24} />
              <h3 className="font-semibold">المساعد السيبراني</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-bl-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-br-none'}`}>
                  {msg.role === 'ai' && <Bot size={16} className="mb-2 text-emerald-400 inline-block mr-2" />}
                  {msg.role === 'user' && <User size={16} className="mb-2 text-emerald-100 inline-block mr-2" />}
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 border border-slate-700 p-3 rounded-2xl rounded-br-none text-sm">
                  يكتب...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اطرح سؤالاً..."
              dir="rtl"
              className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center min-w-[40px]"
            >
              <Send size={18} className={input.trim() ? '' : 'text-slate-500'} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
