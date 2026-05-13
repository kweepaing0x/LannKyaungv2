import { create } from "zustand";

export const useAppStore = create((set) => ({
  user:           null,
  userDoc:        null,
  adminConfig:    null,
  setUser:        (user) => set({ user }),
  setUserDoc:     (userDoc) => set({ userDoc }),
  setAdminConfig: (adminConfig) => set({ adminConfig }),

  userLocation:     null,
  setUserLocation:  (loc) => set({ userLocation: loc }),

  pins:             [],
  setPins:          (pins) => set({ pins }),
  checkRequests:    [],
  setCheckRequests: (reqs) => set({ checkRequests: reqs }),

  activeTab:        "map",
  setActiveTab:     (tab) => set({ activeTab: tab }),
  showPlusModal:    false,
  setShowPlusModal: (v) => set({ showPlusModal: v }),
  showHistory:      false,
  setShowHistory:   (v) => set({ showHistory: v }),
}));
