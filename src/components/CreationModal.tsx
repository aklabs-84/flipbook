import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CreationModalProps {
    isOpen: boolean
    onClose: () => void
    onModeSelect: (mode: 'image' | 'pdf' | 'blank', files?: FileList | null) => void
    isCreating: boolean
    progress: number
}

export default function CreationModal({ isOpen, onClose, onModeSelect, isCreating, progress }: CreationModalProps) {
    const imageInputRef = useRef<HTMLInputElement>(null)
    const pdfInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const modes = [
        {
            id: 'image',
            title: '이미지 첨부로 만들기',
            description: '여러 장의 이미지를 선택하여\\n자동으로 플립북을 생성합니다',
            icon: '📸',
            bgColor: 'bg-brand-purple/10',
            iconBg: 'bg-brand-purple',
            borderColor: 'border-brand-purple/20',
            hoverBorder: 'hover:border-brand-purple',
            action: () => onModeSelect('image')
        },
        {
            id: 'pdf',
            title: 'PDF로 만들기',
            description: '기존 PDF 파일을 가져와서\\n멋진 플립북으로 변환합니다',
            icon: '📄',
            bgColor: 'bg-grass-green/10',
            iconBg: 'bg-grass-green',
            borderColor: 'border-grass-green/20',
            hoverBorder: 'hover:border-grass-green',
            action: () => pdfInputRef.current?.click()
        },
        {
            id: 'blank',
            title: '새 플립북 만들기',
            description: '빈 페이지에서 시작하여\\n나만의 콘텐츠를 자유롭게 채웁니다',
            icon: '🎨',
            bgColor: 'bg-mustard-yellow/10',
            iconBg: 'bg-mustard-yellow',
            borderColor: 'border-mustard-yellow/20',
            hoverBorder: 'hover:border-mustard-yellow',
            action: () => onModeSelect('blank')
        }
    ]

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={!isCreating ? onClose : undefined}
                    className="absolute inset-0 bg-earth-brown/40 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[600px] border border-white/20"
                >
                    {/* Left: Illustration/Intro */}
                    <div className="md:w-1/3 bg-warm-cream/30 p-10 flex flex-col justify-center items-center text-center relative overflow-hidden border-r border-gray-100">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                        <div className="text-6xl mb-6 animate-bounce">✨</div>
                        <h2 className="text-3xl font-black text-earth-brown mb-4 tracking-tight">작업 시작하기</h2>
                        <p className="text-earth-brown/60 text-sm leading-relaxed">
                            어떤 방식으로 플립북을<br />만들고 싶으신가요?
                        </p>

                        {isCreating && (
                            <div className="mt-12 w-full">
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                    <motion.div
                                        className="h-full bg-brand-purple"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-3 text-sm font-bold text-brand-purple animate-pulse">{progress}% 진행 중...</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Toggle Options */}
                    <div className="md:w-2/3 p-8 md:p-12 flex flex-col justify-center">
                        <div className="grid grid-cols-1 gap-4">
                            {modes.map((mode) => (
                                <button
                                    key={mode.id}
                                    disabled={isCreating}
                                    onClick={mode.action}
                                    className={`
                                        flex items-center gap-6 p-6 rounded-3xl border-2 text-left transition-all duration-300 group
                                        ${mode.bgColor} ${mode.borderColor} ${mode.hoverBorder}
                                        ${isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'}
                                    `}
                                >
                                    <div className={`w-14 h-14 rounded-2xl ${mode.iconBg} text-white flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:rotate-6`}>
                                        {mode.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-earth-brown mb-1">{mode.title}</h3>
                                        <p className="text-earth-brown/60 text-xs whitespace-pre-wrap leading-relaxed">
                                            {mode.description}
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:border-transparent transition-colors shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {!isCreating && (
                            <button
                                onClick={onClose}
                                className="mt-8 text-center text-sm font-bold text-gray-400 hover:text-earth-brown transition-colors"
                            >
                                다음에 만들기
                            </button>
                        )}
                    </div>

                    {/* Hidden Inputs */}
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={imageInputRef}
                        onChange={(e) => onModeSelect('image', e.target.files)}
                    />
                    <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        ref={pdfInputRef}
                        onChange={(e) => onModeSelect('pdf', e.target.files)}
                    />
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
