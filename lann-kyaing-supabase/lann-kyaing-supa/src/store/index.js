import { create } from "zustand";

export const useAppStore = create((set) => ({
  // Auth
  user:           null,
  userDoc:        null,
  adminConfig:    null,
  setUser:        (user)        => set({ user }),
  setUserDoc:     (userDoc)     => set({ userDoc }),
  setAdminConfig: (adminConfig) => set({ adminConfig }),

  // Map
  userLocation:    null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // Pins & requests
  pins:             [],
  setPins:          (pins)  => set({ pins }),
  checkRequests:    [],
  setCheckRequests: (reqs)  => set({ checkRequests: reqs }),

  // UI
  activeTab:        "map",
  setActiveTab:     (tab)   => set({ activeTab: tab }),
  showPlusModal:    false,
  setShowPlusModal: (v)     => set({ showPlusModal: v }),
  showHistory:      false,
  setShowHistory:   (v)     => set({ showHistory: v }),

  // Location picking (PlusModal asks map for a tap)
  pickingLocation:    false,
  setPickingLocation: (v)   => set({ pickingLocation: v }),
  pickedLocation:     null,
  setPickedLocation:  (loc) => set({ pickedLocation: loc }),
}));
