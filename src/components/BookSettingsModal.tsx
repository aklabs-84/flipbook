
import { useState, useEffect, useRef } from 'react'
import { Database } from '../types/supabase'
import { optimizeImage } from '../services/imageOptimizer'
import { uploadMedia } from '../services/storageService'

type BookRow = Database['public']['Tables']['books']['Row']

interface BookSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    book: BookRow
    onSave: (bookId: string, settings: { isPublic: boolean, password?: string | null, coverUrl?: string | null, bgmUrl?: string | null }) => Promise<void>
}

export default function BookSettingsModal({ isOpen, onClose, book, onSave }: BookSettingsModalProps) {
    const [isPublic, setIsPublic] = useState(book.is_public)
    const [password, setPassword] = useState('')
    const [hasPassword, setHasPassword] = useState(false)
    const [coverUrl, setCoverUrl] = useState<string | null>(book.cover_url || null)
    const [bgmUrl, setBgmUrl] = useState<string | null>(book.bgm_url || null) // Added bgmUrl state
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isBgmUploading, setIsBgmUploading] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const bgmInputRef = useRef<HTMLInputElement>(null)
    const audioPreviewRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        if (isOpen) {
            setIsPublic(book.is_public)
            setHasPassword(!!book.password_hash)
            setPassword('')
            setCoverUrl(book.cover_url || null)
            setBgmUrl(book.bgm_url || null)
        }
    }, [isOpen, book])

    // Update audio preview when BGM URL changes
    useEffect(() => {
        if (audioPreviewRef.current) {
            audioPreviewRef.current.load()
        }
    }, [bgmUrl])

    if (!isOpen) return null

    const handleSaveWithLogic = async () => {
        setIsLoading(true)
        const updates: { isPublic: boolean, password?: string | null, coverUrl?: string | null, bgmUrl?: string | null } = {
            isPublic,
            coverUrl,
            bgmUrl
        }

        if (password) {
            updates.password = password
        }

        await onSave(book.id, updates)
        setIsLoading(false)
        onClose()
    }

    const handleRemovePassword = async () => {
        if (!confirm('비밀번호를 삭제하시겠습니까? 누구나 볼 수 있게 될 수 있습니다.')) return
        setIsLoading(true)
        // Pass current state values to avoid overwriting them with undefined/null unintentionally
        await onSave(book.id, { isPublic, password: null, coverUrl, bgmUrl })
        setHasPassword(false)
        setIsLoading(false)
    }

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        try {
            setIsUploading(true)
            const file = e.target.files[0]
            const optimizedFile = await optimizeImage(file)
            const folderPath = `${book.user_id}/${book.id}/cover`
            const publicUrl = await uploadMedia(optimizedFile, 'uploads', folderPath)
            setCoverUrl(publicUrl)
        } catch (error) {
            console.error('Cover upload failed:', error)
            alert('커버 이미지 업로드에 실패했습니다.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]

        // Simple client-side size check (e.g., 5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('BGM 파일은 5MB 이하여야 합니다. (MP3 128kbps 권장)')
            return
        }

        try {
            setIsBgmUploading(true)
            const folderPath = `${book.user_id}/${book.id}/bgm`
            // Upload audio file as-is (no optimization for audio yet)
            const publicUrl = await uploadMedia(file, 'uploads', folderPath)
            setBgmUrl(publicUrl)
        } catch (error) {
            console.error('BGM upload failed:', error)
            alert('BGM 업로드에 실패했습니다.')
        } finally {
            setIsBgmUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-gray-800">프로젝트 설정</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Cover Image Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">커버 이미지</label>
                        <div className="flex items-center gap-4">
                            <div
                                className="w-20 h-28 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center relative cursor-pointer group shadow-sm hover:shadow-md transition shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {coverUrl ? (
                                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="text-white text-xs font-bold drop-shadow-md">변경</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-sm text-brand-purple font-medium hover:text-indigo-700 transition"
                                    disabled={isUploading}
                                >
                                    이미지 업로드
                                </button>
                                <p className="text-xs text-gray-400 mt-1 truncate">
                                    JPG, PNG 파일을 올리면<br />자동으로 최적화(WebP)됩니다.
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100"></div>

                    {/* BGM Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-2">배경 음악 (BGM)</label>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <button
                                    onClick={() => bgmInputRef.current?.click()}
                                    className="text-sm text-brand-purple font-medium hover:text-indigo-700 transition"
                                    disabled={isBgmUploading}
                                >
                                    {bgmUrl ? '음악 변경' : '음악 업로드'}
                                </button>
                                <p className="text-xs text-gray-400 mt-1">
                                    MP3, AAC 권장 (5MB 이하)<br />책을 열면 자동으로 반복 재생됩니다.
                                </p>
                                <input
                                    type="file"
                                    ref={bgmInputRef}
                                    className="hidden"
                                    accept="audio/*"
                                    onChange={handleBgmUpload}
                                />
                            </div>
                        </div>
                        {isBgmUploading && (
                            <div className="mt-2 text-xs text-indigo-500 flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                업로드 중...
                            </div>
                        )}
                        {bgmUrl && (
                            <div className="mt-3 bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <audio
                                    ref={audioPreviewRef}
                                    controls
                                    className="w-full h-8"
                                    src={bgmUrl}
                                    loop={false}
                                />
                                <div className="text-xs text-gray-400 mt-1 flex justify-between items-center">
                                    <span className="truncate max-w-[200px]">{bgmUrl.split('/').pop()}</span>
                                    <button
                                        onClick={() => setBgmUrl(null)}
                                        className="text-red-400 hover:text-red-600 font-medium"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100"></div>

                    {/* Public Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-gray-800">공개 설정 (갤러리 노출)</div>
                            <div className="text-xs text-gray-500">켜두면 전시관(Gallery)에 이 책이 나타납니다.</div>
                        </div>
                        <button
                            onClick={() => setIsPublic(!isPublic)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-brand-purple' : 'bg-gray-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    <div className="border-t border-gray-100"></div>

                    {/* Password Section */}
                    <div>
                        <div className="font-medium text-gray-800 mb-2">비밀번호</div>

                        {hasPassword && !password && (
                            <div className="mb-3 flex items-center justify-between bg-green-50 text-green-700 px-3 py-2 rounded text-sm">
                                <span className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                    </svg>
                                    비밀번호가 설정되어 있습니다
                                </span>
                                <button onClick={handleRemovePassword} className="text-xs underline hover:text-green-800">삭제</button>
                            </div>
                        )}

                        <input
                            type="password"
                            placeholder={hasPassword ? "새 비밀번호로 변경하려면 입력" : "비밀번호 설정"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            * 비밀번호를 설정하면 공개 여부와 상관없이 비밀번호를 입력해야 볼 수 있습니다.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSaveWithLogic}
                        disabled={isLoading || isUploading || isBgmUploading}
                        className="px-6 py-2 bg-brand-purple text-white rounded-lg hover:bg-indigo-600 font-medium transition shadow-sm disabled:opacity-50"
                    >
                        {isLoading ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    )
}
