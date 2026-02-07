
import { useState } from 'react'

interface AudioControllerProps {
    isMuted: boolean
    toggleMute: () => void
    isBgmPlaying: boolean
    toggleBgmPlay: () => void
    bgmVolume: number
    changeBgmVolume: (val: number) => void
    isBgmMuted: boolean
    toggleBgmMute: () => void
    sfxVolume: number
    changeSfxVolume: (val: number) => void
}

export default function AudioController({
    isMuted,
    toggleMute,
    isBgmPlaying,
    toggleBgmPlay,
    bgmVolume,
    changeBgmVolume,
    isBgmMuted,
    toggleBgmMute,
    sfxVolume,
    changeSfxVolume
}: AudioControllerProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="relative z-50">
            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-xl transition flex items-center gap-2 border-2 
                    ${isOpen ? 'bg-brand-purple/10 border-brand-purple text-brand-purple' : 'bg-white border-transparent text-gray-500 hover:border-brand-purple/30 hover:text-brand-purple'}
                `}
                title="오디오 설정"
            >
                {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 opacity-50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.75-4.75 3 3V5.25m0 13.5V11l-3-3-4.75 4.75M5.25 8.25h1.5m-1.5 7.5h1.5" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                )}
                {/* <span className="text-sm font-bold hidden sm:inline">오디오</span> */}
            </button>

            {/* Expanded Audio Panel (Dropdown) */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl w-64 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Audio Settings</span>
                        <button onClick={toggleMute} className="text-xs text-brand-purple hover:underline" title="Toggle Master Mute">
                            {isMuted ? 'Unmute All' : 'Mute All'}
                        </button>
                    </div>

                    {/* BGM Controls */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                🎵 BGM
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={toggleBgmPlay} className="p-1.5 hover:bg-gray-100 rounded-full transition" title={isBgmPlaying ? "Pause" : "Play"}>
                                    {isBgmPlaying ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 pl-0.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                        </svg>
                                    )}
                                </button>
                                <button onClick={toggleBgmMute} className="p-1.5 hover:bg-gray-100 rounded-full transition" title={isBgmMuted ? "Unmute BGM" : "Mute BGM"}>
                                    {isBgmMuted ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.75-4.75 3 3V5.25m0 13.5V11l-3-3-4.75 4.75M5.25 8.25h1.5m-1.5 7.5h1.5" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={bgmVolume}
                            onChange={(e) => changeBgmVolume(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                            disabled={isMuted || isBgmMuted}
                        />
                    </div>

                    {/* SFX Controls */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                📖 SFX
                            </span>
                            <span className="text-xs text-gray-400 font-mono">{Math.round(sfxVolume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={sfxVolume}
                            onChange={(e) => changeSfxVolume(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                            disabled={isMuted}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
