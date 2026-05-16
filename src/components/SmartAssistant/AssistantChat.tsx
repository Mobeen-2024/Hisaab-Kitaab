import React from 'react';
import { MessageSquare, Bot, User, Send, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id?: number;
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
}

interface AssistantChatProps {
  messages: Message[];
  chatInput: string;
  setChatInput: (val: string) => void;
  chatLoading: boolean;
  onSendMessage: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}

export default function AssistantChat({
  messages,
  chatInput,
  setChatInput,
  chatLoading,
  onSendMessage,
  chatEndRef
}: AssistantChatProps) {
  const sortedMessages = [...messages].reverse();

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-indigo-400" size={18} />
          Chat with AI Advisor
        </h3>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{sortedMessages.length} messages</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-80 custom-scrollbar">
        {sortedMessages.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Bot size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Ask me anything about your finances.</p>
            <p className="text-xs mt-1 text-slate-600">e.g., "How much did I spend this month?" or "Am I saving enough?"</p>
          </div>
        )}
        {sortedMessages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-white/10'}`}>
              {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} className="text-indigo-400" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/10 text-slate-200 rounded-tl-sm'}`}>
              {msg.content}
              <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-indigo-300' : 'text-slate-500'}`}>
                {format(new Date(msg.timestamp), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Bot size={14} className="text-indigo-400" />
            </div>
            <div className="bg-white/10 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
            placeholder="Ask about your finances..."
            className="flex-1 bg-[#0F172A]/80 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
          />
          <button
            onClick={onSendMessage}
            disabled={chatLoading || !chatInput.trim()}
            className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            {chatLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {['Summarize my finances', 'Where should I cut costs?', 'Am I on track with savings?'].map(prompt => (
            <button
              key={prompt}
              onClick={() => { setChatInput(prompt); }}
              className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
