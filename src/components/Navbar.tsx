import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Navbar() {
    const { user, signOut } = useAuthStore()
    const location = useLocation()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const isActive = (path: string) => location.pathname === path
    const closeMenu = () => setIsMenuOpen(false)

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group z-50" onClick={closeMenu}>
                    <img
                        src="/aklabs_logo.svg"
                        alt="AK Labs Logo"
                        className="h-8 w-auto transition-transform group-hover:scale-105"
                    />
                    <span className="font-bold text-lg text-gray-800 tracking-tight">Flipbook Pro</span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-full">
                    <Link
                        to="/"
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${isActive('/')
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        홈
                    </Link>
                    <Link
                        to="/gallery"
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${isActive('/gallery')
                                ? 'bg-white text-brand-purple shadow-sm'
                                : 'text-gray-500 hover:text-brand-purple'
                            }`}
                    >
                        갤러리
                    </Link>
                    {user && (
                        <Link
                            to="/dashboard"
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${isActive('/dashboard')
                                    ? 'bg-white text-brand-purple shadow-sm'
                                    : 'text-gray-500 hover:text-brand-purple'
                                }`}
                        >
                            내 프로젝트
                        </Link>
                    )}
                </div>

                {/* Desktop User Profile */}
                <div className="hidden md:flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-xs text-gray-400 font-medium">Signed in as</div>
                                <div className="text-sm font-bold text-gray-700 truncate max-w-[120px]">
                                    {user.email?.split('@')[0]}
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-purple to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="text-xs text-gray-400 hover:text-red-500 transition border-l pl-3 ml-1"
                            >
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-full transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            로그인
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Button (Hamburger) */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-2 text-gray-600 hover:text-gray-900 z-50 focus:outline-none"
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-xl px-4 py-6 flex flex-col gap-4 animate-in slide-in-from-top-5 duration-200">
                    <Link
                        to="/"
                        onClick={closeMenu}
                        className={`block px-4 py-3 rounded-xl text-base font-semibold transition ${isActive('/') ? 'bg-gray-100 text-brand-purple' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        홈
                    </Link>
                    <Link
                        to="/gallery"
                        onClick={closeMenu}
                        className={`block px-4 py-3 rounded-xl text-base font-semibold transition ${isActive('/gallery') ? 'bg-gray-100 text-brand-purple' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        갤러리
                    </Link>
                    {user && (
                        <Link
                            to="/dashboard"
                            onClick={closeMenu}
                            className={`block px-4 py-3 rounded-xl text-base font-semibold transition ${isActive('/dashboard') ? 'bg-gray-100 text-brand-purple' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            내 프로젝트
                        </Link>
                    )}

                    <div className="border-t border-gray-100 my-2 pt-4">
                        {user ? (
                            <div className="flex flex-col gap-3 px-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-purple to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                    <span className="text-gray-700 font-medium">{user.email}</span>
                                </div>
                                <button
                                    onClick={() => { signOut(); closeMenu(); }}
                                    className="w-full text-left py-2 text-red-500 font-medium hover:text-red-600"
                                >
                                    로그아웃
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                onClick={closeMenu}
                                className="block w-full text-center py-3 bg-gray-900 text-white rounded-xl font-bold"
                            >
                                로그인
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}
