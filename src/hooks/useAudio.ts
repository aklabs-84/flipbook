
import { useEffect, useRef, useState, useCallback } from 'react'
import { Howl, Howler } from 'howler'
import { useBookStore } from '../store/bookStore'

export const useAudio = () => {
    const { bgmUrl } = useBookStore()

    // Global Mute (Master Switch)
    const [isMuted, setIsMuted] = useState(false)

    // BGM States
    const [bgmVolume, setBgmVolume] = useState(0.2)
    const [isBgmPlaying, setIsBgmPlaying] = useState(false)
    const [isBgmMuted, setIsBgmMuted] = useState(false)
    const bgmRef = useRef<Howl | null>(null)

    // SFX States
    const [sfxVolume, setSfxVolume] = useState(1.0)
    const sfxRef = useRef<Howl | null>(null)

    const [audioContextUnlocked, setAudioContextUnlocked] = useState(false)

    // Unlock Audio Context on first interaction
    useEffect(() => {
        const unlockAudio = () => {
            if (Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => {
                    setAudioContextUnlocked(true)
                })
            } else {
                setAudioContextUnlocked(true)
            }
        }
        document.addEventListener('click', unlockAudio)
        document.addEventListener('touchstart', unlockAudio)
        document.addEventListener('keydown', unlockAudio)

        return () => {
            document.removeEventListener('click', unlockAudio)
            document.removeEventListener('touchstart', unlockAudio)
            document.removeEventListener('keydown', unlockAudio)
        }
    }, [])

    // Load SFX
    useEffect(() => {
        sfxRef.current = new Howl({
            src: ['/sounds/page-flip.mp3'],
            volume: 1.0,
            preload: true,
            onload: () => console.log("SFX Loaded"),
            onloaderror: (_id, err) => console.warn("SFX Load Error:", err)
        })
        return () => {
            sfxRef.current?.unload()
        }
    }, [])

    // SFX Volume Update
    useEffect(() => {
        if (sfxRef.current) {
            // If master mute is on, volume is 0. Otherwise use sfxVolume.
            sfxRef.current.volume(isMuted ? 0 : sfxVolume)
        }
    }, [sfxVolume, isMuted])

    // Load/Init BGM
    useEffect(() => {
        if (bgmRef.current) {
            bgmRef.current.stop()
            bgmRef.current.unload()
            bgmRef.current = null
            setIsBgmPlaying(false)
        }

        if (bgmUrl) {
            const sound = new Howl({
                src: [bgmUrl],
                html5: true,
                loop: true,
                volume: bgmVolume,
                autoplay: false, // Manual control
                preload: true,
                onplay: () => setIsBgmPlaying(true),
                onpause: () => setIsBgmPlaying(false),
                onstop: () => setIsBgmPlaying(false),
                onend: () => setIsBgmPlaying(false),
                onloaderror: (_id, err) => console.error("BGM Load Error:", err)
            })

            bgmRef.current = sound

            // Auto-play rule: If context unlocked, not master muted, not bgm muted -> play
            if (audioContextUnlocked && !isMuted && !isBgmMuted) {
                sound.play()
            }
        }
        // Cleanup on unmount or URL change
        return () => {
            if (bgmRef.current) {
                bgmRef.current.stop()
                bgmRef.current.unload()
            }
        }
    }, [bgmUrl, audioContextUnlocked])

    // BGM Volume/Mute Update
    useEffect(() => {
        if (bgmRef.current) {
            const effectiveVolume = (isMuted || isBgmMuted) ? 0 : bgmVolume
            bgmRef.current.volume(effectiveVolume)

            // If muted, pause? No, just volume 0 is better for "mute" behavior usually, 
            // but for streaming audio, sometimes pause is better. 
            // User asked for "Mute", usually implies silent playback.
            // Let's keep it playing but silent.
        }
    }, [bgmVolume, isMuted, isBgmMuted])

    const toggleBgmPlay = useCallback(() => {
        if (!bgmRef.current) return
        if (isBgmPlaying) {
            bgmRef.current.pause()
        } else {
            bgmRef.current.play()
        }
    }, [isBgmPlaying])

    const toggleBgmMute = useCallback(() => {
        setIsBgmMuted(prev => !prev)
    }, [])

    const changeBgmVolume = useCallback((val: number) => setBgmVolume(val), [])
    const changeSfxVolume = useCallback((val: number) => setSfxVolume(val), [])

    const playPageFlip = useCallback(() => {
        if (isMuted || sfxVolume === 0) return
        if (sfxRef.current) {
            const rate = 0.9 + Math.random() * 0.2
            sfxRef.current.rate(rate)
            // Ensure volume is correct right before playing
            sfxRef.current.volume(isMuted ? 0 : sfxVolume)
            sfxRef.current.seek(0)
            sfxRef.current.play()
        }
    }, [isMuted, sfxVolume])

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev)
    }, [])

    // Helpers
    const playBGM = useCallback(() => {
        if (!bgmRef.current?.playing()) bgmRef.current?.play()
    }, [])

    const pauseBGM = useCallback(() => {
        bgmRef.current?.pause()
    }, [])

    return {
        // BGM
        isBgmPlaying,
        toggleBgmPlay,
        bgmVolume,
        changeBgmVolume,
        isBgmMuted,
        toggleBgmMute,
        playBGM, // keeping legacy
        pauseBGM, // keeping legacy

        // SFX
        playPageFlip,
        sfxVolume,
        changeSfxVolume,

        // Global
        toggleMute,
        isMuted
    }
}
