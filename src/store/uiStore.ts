import { create } from 'zustand'

interface UIState {
    scale: number
    isCleanMode: boolean
    isLoading: boolean
    activeModal: 'login' | 'share' | 'settings' | null
    showPageNumbers: boolean

    setScale: (scale: number) => void
    toggleCleanMode: () => void
    setLoading: (loading: boolean) => void
    setActiveModal: (modal: UIState['activeModal']) => void
    setShowPageNumbers: (showProxy: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
    scale: 1,
    isCleanMode: false,
    isLoading: false,
    activeModal: null,
    showPageNumbers: true,

    setScale: (scale) => set({ scale }),
    toggleCleanMode: () => set((state) => ({ isCleanMode: !state.isCleanMode })),
    setLoading: (isLoading) => set({ isLoading }),
    setActiveModal: (activeModal) => set({ activeModal }),
    setShowPageNumbers: (showPageNumbers) => set({ showPageNumbers })
}))
