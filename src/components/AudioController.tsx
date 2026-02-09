
import { useState } from 'react'
import { Sliders } from 'lucide-react'

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
    typingSpeed?: number
    changeTypingSpeed?: (val: number) => void
    isTypewriterEnabled?: boolean
    toggleTypewriter?: () => void
    bookType?: 'image' | 'pdf' | 'storybook'
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
    changeSfxVolume,
    typingSpeed = 50,
    changeTypingSpeed,
    isTypewriterEnabled = true,
    toggleTypewriter,
    bookType
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
                title="북 설정"
            >
                <Sliders className={`w-5 h-5 ${isBgmPlaying && !isMuted ? 'animate-pulse' : ''}`} />
                {/* <span className="text-xs font-bold">SETTING</span> */}
            </button>

            {isOpen && (
                <div className="absolute top-12 right-0 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Book Settings</span>
                        <button
                            onClick={toggleMute}
                            className={`text-xs font-bold px-2 py-1 rounded transition-colors ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
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
                    <div className="mb-4">
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

                    {/* Typewriter Speed (Storybook Only) */}
                    {bookType === 'storybook' && changeTypingSpeed && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    ✨ 글자 효과
                                </span>
                                <button
                                    onClick={toggleTypewriter}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isTypewriterEnabled ? 'bg-brand-purple' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isTypewriterEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {isTypewriterEnabled && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                            ⌨️ 글자 속도
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {typingSpeed < 30 ? '빠름' : typingSpeed > 80 ? '느림' : '보통'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        // Map delay (100-10) to speed (1-10)
                                        value={11 - (typingSpeed / 10)}
                                        onChange={(e) => {
                                            const speedLevel = parseFloat(e.target.value)
                                            const delay = (11 - speedLevel) * 10
                                            changeTypingSpeed(delay)
                                        }}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-purple"
                                        disabled={isMuted}
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                        <span>느림</span>
                                        <span>빠름</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
