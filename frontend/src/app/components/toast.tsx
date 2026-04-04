"use client";

import { X } from "lucide-react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
      <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700/50 backdrop-blur-md">
        <span className="text-amber-400">⚠️</span>
        <p className="text-sm font-medium">{message}</p>
        <button 
          onClick={onClose}
          className="hover:bg-white/10 p-1 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}