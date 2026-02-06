import React, { useState } from 'react'

interface PasswordGateProps {
    bookTitle: string
    onPasswordSubmit: (password: string) => Promise<boolean>
}

export default function PasswordGate({ bookTitle, onPasswordSubmit }: PasswordGateProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [shake, setShake] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password) return

        setIsLoading(true)
        setError('')

        const isValid = await onPasswordSubmit(password)

        if (isValid) {
            // Success handled by parent (unmounting this gate)
        } else {
            setError('비밀번호가 일치하지 않습니다.')
            setShake(true)
            setTimeout(() => setShake(false), 500)
        }
        setIsLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-warm-cream flex items-center justify-center z-50 p-4 font-sans text-earth-brown">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F39233 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            <div className={`bg-white rounded-[2rem] shadow-[0_20px_50px_-20px_rgba(74,50,40,0.3)] w-full max-w-md overflow-hidden transition-transform relative border-4 border-dashed border-mustard-yellow/30 ${shake ? 'animate-shake' : ''}`}>
                <div className="p-8 text-center relative z-10">
                    <div className="w-20 h-20 bg-tomato-red/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce" style={{ animationDuration: '3s' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-tomato-red">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-black text-earth-brown mb-3 tracking-tight">비밀 서재</h2>
                    <p className="text-earth-brown/70 mb-8 font-medium leading-relaxed">
                        <span className="font-bold text-tomato-red">'{bookTitle}'</span> 이야기는<br />
                        작가님이 비밀번호를 걸어두셨어요!
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="암호를 대시오! 🗝️"
                                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-mustard-yellow focus:ring-4 focus:ring-mustard-yellow/20 outline-none transition text-center text-lg font-bold text-earth-brown placeholder-earth-brown/30 bg-gray-50 focus:bg-white"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-tomato-red/10 text-tomato-red px-4 py-2 rounded-xl text-sm font-bold animate-pulse flex items-center justify-center gap-2">
                                <span>🚫</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !password}
                            className="w-full py-4 bg-mustard-yellow hover:bg-orange-400 text-white font-black text-lg rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_0_#d97706] active:translate-y-[2px] active:shadow-none"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    확인 중...
                                </>
                            ) : (
                                '입장하기 🚪'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Simple shake animation style injection */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    )
}
