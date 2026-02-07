import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useBookStore } from '../store/bookStore'
import { useUIStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useResponsiveBook } from '../hooks/useResponsive'
import Book from '../components/Book'
import PasswordGate from '../components/PasswordGate'
import AudioController from '../components/AudioController'
import { useAudio } from '../hooks/useAudio'

export default function Viewer() {
    const { bookId } = useParams()
    const {
        fetchBookDetails,
        resetBook,
        title,
        passwordHash,
        checkPassword,
        initDummyData
    } = useBookStore()
    const { setLoading } = useUIStore()

    const [isAuthorized, setIsAuthorized] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)

    const {
        playPageFlip,
        toggleMute,
        isMuted,
        bgmVolume,
        changeBgmVolume,
        isBgmPlaying,
        toggleBgmPlay,
        isBgmMuted,
        toggleBgmMute,
        sfxVolume,
        changeSfxVolume
    } = useAudio()

    useResponsiveBook()

    useEffect(() => {
        resetBook()
        if (bookId) {
            setLoading(true)
            fetchBookDetails(bookId).then(() => {
                setLoading(false)
                setIsCheckingAuth(false)
            })
        } else {
            initDummyData()
            setIsCheckingAuth(false)
            setIsAuthorized(true) // Helper for dev
        }
    }, [bookId, fetchBookDetails, resetBook, setLoading, initDummyData])

    useEffect(() => {
        // Auto-authorize if no password
        if (!isCheckingAuth && !passwordHash) {
            setIsAuthorized(true)
        }
    }, [passwordHash, isCheckingAuth])

    // --- Auth Check ---
    const { user } = useAuthStore()

    // If not logged in, show Login Gate
    if (!user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-warm-cream font-sans text-earth-brown p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-4 border-mustard-yellow/20">
                    <div className="text-6xl mb-6 animate-bounce">🔐</div>
                    <h2 className="text-2xl font-black mb-2 text-earth-brown">로그인이 필요해요</h2>
                    <p className="text-earth-brown/70 mb-8 font-medium">
                        이 책은 작가님의 소중한 작품입니다.<br />
                        로그인하고 상상의 세계를 감상해보세요!
                    </p>
                    <Link
                        to="/login"
                        state={{ from: `/view/${bookId}` }}
                        className="block w-full py-4 bg-brand-purple text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-600 transition-all transform hover:-translate-y-1"
                    >
                        로그인하러 가기
                    </Link>
                    <Link
                        to="/gallery"
                        className="block mt-4 text-sm text-earth-brown/50 hover:text-earth-brown font-medium underline"
                    >
                        전시관으로 돌아가기
                    </Link>
                </div>
            </div>
        )
    }

    const handlePasswordSubmit = async (password: string) => {
        const isValid = await checkPassword(password)
        if (isValid) {
            setIsAuthorized(true)
            return true
        }
        return false
    }

    // 1. Loading State
    if (isCheckingAuth) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-warm-cream">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-mustard-yellow/30 border-t-mustard-yellow rounded-full animate-spin"></div>
                    <span className="font-bold text-earth-brown animate-pulse">페이지를 준비 중입니다...</span>
                </div>
            </div>
        )
    }

    // 2. Password Gate (Already Themed in Component)
    if (!isAuthorized && passwordHash) {
        return (
            <PasswordGate
                bookTitle={title}
                onPasswordSubmit={handlePasswordSubmit}
            />
        )
    }

    // 3. Main Viewer
    return (
        <div className="h-screen flex flex-col bg-warm-cream overflow-hidden relative font-sans text-earth-brown">
            {/* Background Decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F39233 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {/* Minimal Header */}
            <header className="absolute top-0 left-0 right-0 h-20 flex items-start pt-6 px-6 justify-between z-10 pointer-events-none">
                <div className="pointer-events-auto">
                    <Link
                        to="/dashboard"
                        className="group flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white/50 px-4 py-2 rounded-2xl shadow-sm hover:shadow-md hover:bg-white transition-all text-earth-brown hover:text-carrot-orange"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 transition-transform group-hover:-translate-x-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span className="font-bold text-sm">나가기</span>
                    </Link>
                </div>

                {/* Title */}
                <h1 className="font-bold text-earth-brown bg-white/80 backdrop-blur-md border border-white/50 px-6 py-2 rounded-2xl shadow-sm text-sm pointer-events-auto opacity-0 hover:opacity-100 transition-opacity translate-y-[-10px] hover:translate-y-0 duration-300">
                    {title}
                </h1>

                <div className="pointer-events-auto">
                    <AudioController
                        isMuted={isMuted}
                        toggleMute={toggleMute}
                        isBgmPlaying={isBgmPlaying}
                        toggleBgmPlay={toggleBgmPlay}
                        bgmVolume={bgmVolume}
                        changeBgmVolume={changeBgmVolume}
                        isBgmMuted={isBgmMuted}
                        toggleBgmMute={toggleBgmMute}
                        sfxVolume={sfxVolume}
                        changeSfxVolume={changeSfxVolume}
                    />
                </div>
            </header>

            {/* Book Stage */}
            <main className="flex-1 flex items-center justify-center relative perspective-3000 overflow-hidden">
                <div className="relative transform-style-3d transition-transform duration-300 drop-shadow-2xl">
                    <Book
                        isImageEditMode={false}
                        onFlipPage={playPageFlip}
                    // No edit handlers passed = read only
                    />
                </div>
            </main>
        </div>
    )
}
