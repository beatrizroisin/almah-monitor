import { create } from 'zustand';
import { useEffect } from 'react';
import './Toast.scss';

const useToastStore = create((set) => ({
  message: null,
  show(message) {
    set({ message });
    setTimeout(() => set({ message: null }), 3000);
  },
}));

export function toast(message) {
  useToastStore.getState().show(message);
}

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  return (
    <div className={`toast ${message ? 'toast--show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
