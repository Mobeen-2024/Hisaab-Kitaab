import { create } from 'zustand';

interface UIState {
  isQuickEntryOpen: boolean;
  isAddCustomerModalOpen: boolean;
  isProfileModalOpen: boolean;
  isNotificationsOpen: boolean;
  isMessagesOpen: boolean;
  isSearchOpen: boolean;
  isImportModalOpen: boolean;
  
  setQuickEntryOpen: (open: boolean) => void;
  setAddCustomerModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setMessagesOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  
  closeAllModals: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isQuickEntryOpen: false,
  isAddCustomerModalOpen: false,
  isProfileModalOpen: false,
  isNotificationsOpen: false,
  isMessagesOpen: false,
  isSearchOpen: false,
  isImportModalOpen: false,

  setQuickEntryOpen: (open) => set({ isQuickEntryOpen: open }),
  setAddCustomerModalOpen: (open) => set({ isAddCustomerModalOpen: open }),
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
  setNotificationsOpen: (open) => set({ isNotificationsOpen: open }),
  setMessagesOpen: (open) => set({ isMessagesOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setImportModalOpen: (open) => set({ isImportModalOpen: open }),
  
  closeAllModals: () => set({
    isQuickEntryOpen: false,
    isAddCustomerModalOpen: false,
    isProfileModalOpen: false,
    isNotificationsOpen: false,
    isMessagesOpen: false,
    isSearchOpen: false,
    isImportModalOpen: false
  }),
}));
