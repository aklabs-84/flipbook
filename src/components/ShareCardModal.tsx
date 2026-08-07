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

export default function ShareCardModal({ isOpen, onClose, book }: ShareCardModalProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string>('')
    const [isDownloading, setIsDownloading] = useState(false)
    const [copied, setCopied] = useState(false)

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
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 })
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
                    {/* Card Preview (also used as the export target) */}
                    <div
                        ref={cardRef}
                        className="w-[300px] bg-white flex flex-col items-center px-6 py-8 gap-5 shrink-0"
                        style={{ fontFamily: 'sans-serif' }}
                    >
                        <div className="w-40 h-56 rounded-lg overflow-hidden bg-gray-100 shadow-md shrink-0">
                            {book.cover_url ? (
                                <img
                                    src={book.cover_url}
                                    alt={book.title}
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Cover</div>
                            )}
                        </div>

                        <div className="text-center">
                            <div className="font-bold text-lg text-earth-brown break-words">{book.title}</div>
                            {book.author && (
                                <div className="text-sm text-gray-500 mt-1">{book.author}</div>
                            )}
                        </div>

                        {qrDataUrl && (
                            <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />
                        )}

                        <div className="text-[11px] text-gray-400 tracking-wide">SCAN TO READ</div>
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
