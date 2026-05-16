import React from 'react';
import { Lightbulb } from 'lucide-react';

interface AssistantInsightsProps {
  insights: string[] | null;
  loading: boolean;
}

export default function AssistantInsights({ insights, loading }: AssistantInsightsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl animate-pulse">
            <div className="w-6 h-6 bg-white/10 rounded-lg mb-3" />
            <div className="h-3 bg-white/10 rounded mb-2 w-full" />
            <div className="h-3 bg-white/10 rounded mb-2 w-4/5" />
            <div className="h-3 bg-white/10 rounded w-3/5" />
          </div>
        ))}
      </div>
    );
  }

  if (!insights || insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {insights.map((insight, i) => (
        <div key={i} className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-5 rounded-2xl relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 rounded-l-2xl" />
          <Lightbulb className="text-indigo-400 mb-3" size={20} />
          <p className="text-indigo-100 text-sm leading-relaxed">{insight}</p>
        </div>
      ))}
    </div>
  );
}
