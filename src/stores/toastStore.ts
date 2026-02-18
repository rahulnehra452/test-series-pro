import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

let toastHideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'info',
  showToast: (message, type = 'info') => {
    if (toastHideTimer) {
      clearTimeout(toastHideTimer);
      toastHideTimer = null;
    }
    set({ visible: true, message, type });
    // Auto-hide after 3 seconds
    toastHideTimer = setTimeout(() => {
      set({ visible: false });
      toastHideTimer = null;
    }, 3000);
  },
  hideToast: () => {
    if (toastHideTimer) {
      clearTimeout(toastHideTimer);
      toastHideTimer = null;
    }
    set({ visible: false });
  },
}));
