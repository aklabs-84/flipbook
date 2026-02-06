import { useRef, useEffect } from 'react'

// Short "Paper Flip" sound placeholder
// Ideally, this should be a real MP3/WAV file or a longer Base64 string.
const DEFAULT_FLIP_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' // Truncated placeholder

export const useSound = (enabled = true) => {
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        try {
            audioRef.current = new Audio(DEFAULT_FLIP_SOUND)
            audioRef.current.volume = 0.5
        } catch (e) {
            console.error("Audio initialization failed", e)
        }
    }, [])

    const playFlipSound = () => {
        if (!enabled || !audioRef.current) return

        // Clone node to allow overlapping sounds if flipped quickly
        // or just reset currentTime
        const sound = audioRef.current
        sound.currentTime = 0
        sound.play().catch(e => {
            // Auto-play policies might block this if no interaction yet
            console.warn("Audio play failed (user interaction required?)", e)
        })
    }

    return { playFlipSound }
}
