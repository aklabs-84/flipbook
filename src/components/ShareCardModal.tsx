import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { toPng } from 'html-to-image'
import { X, Download, Copy, Check, Loader2 } from 'lucide-react'

interface ShareCardModalProps {
    isOpen: boolean
    onClose: () => void
    book: {
        id: string
        title: string
        author: string | null
        cover_url: string | null
    }
}

type CardStyle = 'literary' | 'photo'

export default function ShareCardModal({ isOpen, onClose, book }: ShareCardModalProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string>('')
    const [isDownloading, setIsDownloading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [cardStyle, setCardStyle] = useState<CardStyle>('literary')

    const shareUrl = `${window.location.origin}/view/${book.id}`

    useEffect(() => {
        if (!isOpen) return
        setCopied(false)
        QRCode.toDataURL(shareUrl, { width: 300, margin: 1, color: { dark: '#4A3228', light: '#FFFFFF' } })
            .then(setQrDataUrl)
            .catch((err) => console.error('QR code generation failed:', err))
    }, [isOpen, shareUrl])

    if (!isOpen) return null

    const handleDownload = async () => {
        if (!cardRef.current) return
        try {
            setIsDownloading(true)
            const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
            const link = document.createElement('a')
            link.download = `${book.title || 'flipbook'}-share-card.png`
            link.href = dataUrl
            link.click()
        } catch (error) {
            console.error('Failed to generate share card image:', error)
            alert('이미지 생성에 실패했습니다.')
        } finally {
            setIsDownloading(false)
        }
    }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-gray-800">공유 카드</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex flex-col items-center gap-5">
                    {/* Style Selector */}
                    <div className="flex gap-2 w-[300px]">
                        <button
                            onClick={() => setCardStyle('literary')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${cardStyle === 'literary' ? 'bg-earth-brown text-white border-earth-brown' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                            리터러리 문고본
                        </button>
                        <button
                            onClick={() => setCardStyle('photo')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${cardStyle === 'photo' ? 'bg-earth-brown text-white border-earth-brown' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                            인디 포토 진
                        </button>
                    </div>

                    {/* Card Preview (also used as the export target) */}
                    <div ref={cardRef} className="w-[300px] shrink-0" style={{ aspectRatio: '2 / 3' }}>
                        {cardStyle === 'literary' ? (
                            <div
                                className="w-full h-full"
                                style={{ display: 'grid', gridTemplateColumns: '10px 1fr', background: '#F4EEDE', borderRadius: '3px', overflow: 'hidden' }}
                            >
                                <div style={{ background: '#A23B2E' }} />
                                <div className="flex flex-col items-center" style={{ padding: '24px 22px 18px' }}>
                                    <div style={{ width: '74%', aspectRatio: '3 / 4', overflow: 'hidden', flexShrink: 0, boxShadow: '0 1px 0 rgba(0,0,0,0.06)', background: '#EFE9D8' }}>
                                        {book.cover_url ? (
                                            <img
                                                src={book.cover_url}
                                                alt={book.title}
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">No Cover</div>
                                        )}
                                    </div>
                                    <div style={{ width: 34, height: 1, background: '#C9BFA0', margin: '14px 0 10px', flexShrink: 0 }} />
                                    <div style={{ fontFamily: "'Nanum Myeongjo', 'Noto Serif KR', serif", fontSize: 18, fontWeight: 800, color: '#2B2620', textAlign: 'center', lineHeight: 1.35, flexShrink: 0 }}>
                                        {book.title}
                                    </div>
                                    {book.author && (
                                        <div style={{ marginTop: 7, fontSize: 11.5, letterSpacing: '0.12em', color: '#7A7360', flexShrink: 0 }}>
                                            {book.author}
                                        </div>
                                    )}
                                    <div className="flex items-center" style={{ marginTop: 14, gap: 12, flexShrink: 0 }}>
                                        <div className="flex items-center justify-center" style={{ width: 56, height: 56, background: '#fff', border: '1px solid #C9BFA0', flexShrink: 0 }}>
                                            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-full h-full" />}
                                        </div>
                                        <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#A69D84', textTransform: 'uppercase' }}>Scan to Read</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full" style={{ position: 'relative', borderRadius: '3px', overflow: 'hidden', background: '#12110F' }}>
                                <div style={{ position: 'absolute', inset: 0 }}>
                                    {book.cover_url ? (
                                        <img
                                            src={book.cover_url}
                                            alt={book.title}
                                            crossOrigin="anonymous"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px]">No Cover</div>
                                    )}
                                </div>
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,9,7,0) 38%, rgba(10,9,7,0.55) 62%, rgba(8,7,6,0.94) 100%)' }} />
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ width: 22, height: 3, background: '#6E93A0' }} />
                                    <div style={{ fontFamily: "'Black Han Sans', 'Apple SD Gothic Neo', sans-serif", fontSize: 25, lineHeight: 1.25, color: '#F5F1E6' }}>
                                        {book.title}
                                    </div>
                                    <div className="flex items-end justify-between" style={{ gap: 12 }}>
                                        {book.author ? (
                                            <div style={{ fontSize: 12, color: '#C7C0AD' }}>
                                                <span style={{ display: 'block', fontSize: 9.5, letterSpacing: '0.16em', color: '#6E93A0', textTransform: 'uppercase', marginBottom: 4 }}>
                                                    Author
                                                </span>
                                                {book.author}
                                            </div>
                                        ) : <div />}
                                        <div className="flex items-center justify-center" style={{ width: 56, height: 56, background: 'rgba(245,241,230,0.94)', flexShrink: 0 }}>
                                            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-full h-full" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleCopyLink}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? '복사됨' : '링크 복사'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-brand-purple text-white font-medium hover:bg-indigo-600 transition disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            이미지 다운로드
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
