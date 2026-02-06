import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'

interface AuthState {
    user: User | null
    session: Session | null
    isInitialized: boolean

    setSession: (session: Session | null) => void
    initialize: () => void
    signInWithGoogle: () => Promise<void>
    signInWithKakao: () => Promise<void>
    signOut: () => Promise<void>
}

import { supabase } from '../lib/supabase'

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isInitialized: false,

    setSession: (session) => set({
        session,
        user: session?.user ?? null,
        isInitialized: true
    }),

    initialize: () => set({ isInitialized: true }),

    signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) throw error
    },

    signInWithKakao: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) throw error
    },

    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null })
    }
}))
