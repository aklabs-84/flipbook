import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useBookStore } from '../store/bookStore'
// @ts-ignore
import { Database } from '../types/supabase'
import BookSettingsModal from '../components/BookSettingsModal'
import CreationModal from '../components/CreationModal'
import ImageUploadModal from '../components/ImageUploadModal'
import TitleInputModal from '../components/TitleInputModal'
import Modal from '../components/Modal'

import { Share2 } from 'lucide-react'

type BookRow = Database['public']['Tables']['books']['Row']

export default function Dashboard() {
    const { user, signOut, isInitialized } = useAuthStore()
    const { fetchUserBooks } = useBookStore()
    const navigate = useNavigate()

    const [books, setBooks] = useState<BookRow[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [progress, setProgress] = useState(0)

    const [settingsModalOpen, setSettingsModalOpen] = useState(false)
    const [creationModalOpen, setCreationModalOpen] = useState(false)
    const [imageModalOpen, setImageModalOpen] = useState(false)
    const [selectedBookForSettings, setSelectedBookForSettings] = useState<BookRow | null>(null)
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    // Title Modal State
    const [titleModalOpen, setTitleModalOpen] = useState(false)
    const [titleModalConfig, setTitleModalConfig] = useState<{
        type: 'create' | 'edit',
        title: string,
        initialValue: string,
        bookId?: string,
        mode?: 'image' | 'pdf' | 'blank',
        files?: FileList | null
    }>({ type: 'create', title: '', initialValue: '' })

    // Share Modal State
    const [shareModal, setShareModal] = useState<{
        isOpen: boolean
        title: string
        message: string
        type: 'success' | 'danger' | 'default'
    }>({ isOpen: false, title: '', message: '', type: 'default' })

    useEffect(() => {
        if (!isInitialized) return

        if (!user) {
            navigate('/login')
            return
        }

        fetchUserBooks(user.id).then(data => {
            setBooks(data)
            setLoading(false)
        })
    }, [user, isInitialized, fetchUserBooks, navigate])

    const handleLogout = async () => {
        await signOut()
        navigate('/')
    }

    const handleModeSelect = async (mode: 'image' | 'pdf' | 'blank', files?: FileList | null) => {
        if (!user) return

        let defaultTitle = ""
        if (mode === 'pdf') defaultTitle = files?.[0]?.name.replace('.pdf', '') || "PDF 플립북"
        else if (mode === 'image') defaultTitle = "사진 앨범"
        else defaultTitle = "새 플립북"

        // For Image mode, we might want to capture files first, OR ask for title first.
        // Current flow: Image/PDF/Blank -> Title -> (Image specific: Upload Modal -> Create) OR (Others: Create)

        // However, user requested flow improvement: Image Mode -> Upload Modal -> Create (with title?)
        // Actually, for Image Mode, let's keep the flow: 
        // 1. Click 'Image' -> Open Upload Modal (Done in CreationModal)
        // 2. Add Images -> Click 'Upload' -> NOW Ask for Title -> Create

        if (mode === 'image' && (!files || files.length === 0)) {
            // Came from Creation Modal aiming to open Upload Modal
            setCreationModalOpen(false)
            setImageModalOpen(true)
            return
        }

        // If we are here, it means we either have files (from drag drop or upload modal callback) or it's blank/pdf mode
        // So we ask for title now.
        setTitleModalConfig({
            type: 'create',
            title: '프로젝트 이름을 입력하세요',
            initialValue: defaultTitle,
            mode,
            files
        })
        setTitleModalOpen(true)
    }

    const handleTitleConfirm = (title: string) => {
        setTitleModalOpen(false)

        if (titleModalConfig.type === 'create') {
            const { mode, files } = titleModalConfig
            if (!mode) return

            if (mode === 'image') {
                // If we have files (from Upload Modal), we proceed to create
                if (files && files.length > 0) {
                    // We need to convert FileList to File[] if strictly needed, but startCreation handles FileList?
                    // Wait, handleImageUpload takes File[]. 
                    // Let's unify.
                    // If we came from ImageUploadModal, 'files' is actuall File[] casted to FileList? No.
                    // We need to handle the specific case where handleImageUpload calls this? 
                    // No, handleImageUpload calls createBookFromImages directly.

                    // Let's refactor handleImageUpload to use this modal.
                }
                // Actually, let's look at handleImageUpload
                return
            }

            startCreation(mode as 'pdf' | 'blank', title, files)
        } else if (titleModalConfig.type === 'edit') {
            if (titleModalConfig.bookId) {
                useBookStore.getState().updateBookTitle(titleModalConfig.bookId, title)
                setBooks(books.map(b => b.id === titleModalConfig.bookId ? { ...b, title } : b))
            }
        }
    }

    const startCreation = async (mode: 'pdf' | 'blank', title: string, files?: FileList | null) => {
        if (!user) return

        setCreating(true)
        setProgress(0)
        let newBookId = null

        try {
            if (mode === 'blank') {
                newBookId = await useBookStore.getState().createBook(user.id, title)
            } else if (mode === 'pdf' && files?.[0]) {
                newBookId = await useBookStore.getState().createBookFromPDF(user.id, title, files[0], (p) => setProgress(p))
            }

            if (newBookId) {
                navigate(`/edit/${newBookId}`)
            }
        } catch (error) {
            console.error("Creation failed:", error)
            alert("생성 도중 오류가 발생했습니다.")
        } finally {
            setCreating(false)
            setProgress(0)
        }
    }

    const handleImageUpload = async (finalFiles: File[]) => {
        // This is called from ImageUploadModal with selected files
        // Now we need to ask for title
        setImageModalOpen(false)

        // Store files temporarily in state or pass through config
        // Since File[] cannot be easily passed as FileList, we'll handle it inside handleTitleConfirm or special case
        setSelectedFiles(finalFiles)

        setTitleModalConfig({
            type: 'create',
            title: '프로젝트 이름을 입력하세요',
            initialValue: '사진 앨범',
            mode: 'image',
            // We don't pass files here because they are in selectedFiles state
        })
        setTitleModalOpen(true)
    }

    // Actually execute creation after title is confirmed
    const executeImageCreation = async (title: string) => {
        if (!user || selectedFiles.length === 0) return

        setCreating(true)
        setProgress(0)
        let newBookId = null

        try {
            newBookId = await useBookStore.getState().createBookFromImages(
                user.id,
                title,
                selectedFiles,
                (p) => setProgress(p)
            )

            if (newBookId) {
                navigate(`/edit/${newBookId}`)
            } else {
                // Handle case where creation returned null (error swallowed in store)
                alert("프로젝트 생성에 실패했습니다. 콘솔을 확인해주세요.")
                setCreating(false)
            }
        } catch (error) {
            console.error("Creation failed:", error)
            alert("생성 도중 오류가 발생했습니다.")
            setCreating(false)
        }
    }

    const handleEditTitle = async (e: React.MouseEvent, book: BookRow) => {
        e.preventDefault()
        e.stopPropagation()

        setTitleModalConfig({
            type: 'edit',
            title: '프로젝트 이름을 변경하세요',
            initialValue: book.title,
            bookId: book.id
        })
        setTitleModalOpen(true)
    }

    const handleDeleteBook = async (bookId: string) => {
        try {
            await useBookStore.getState().deleteBook(bookId)
            setBooks(books.filter(b => b.id !== bookId))
            setSettingsModalOpen(false)
            setSelectedBookForSettings(null)
        } catch (error) {
            console.error(error)
            alert('삭제에 실패했습니다.')
        }
    }

    const handleOpenSettings = (e: React.MouseEvent, book: BookRow) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedBookForSettings(book)
        setSettingsModalOpen(true)
    }

    const handleSaveSettings = async (bookId: string, settings: { title: string, isPublic: boolean, password?: string | null, coverUrl?: string | null, bgmUrl?: string | null }) => {
        // Update title if changed
        const currentBook = books.find(b => b.id === bookId)
        if (currentBook && currentBook.title !== settings.title) {
            await useBookStore.getState().updateBookTitle(bookId, settings.title)
        }

        await useBookStore.getState().updateBookSettings(bookId, settings)

        // Refetch or update local state
        setBooks(books.map(b => {
            if (b.id === bookId) {
                return {
                    ...b,
                    title: settings.title,
                    is_public: settings.isPublic,
                    password_hash: settings.password !== undefined ? settings.password : b.password_hash,
                    cover_url: settings.coverUrl !== undefined ? settings.coverUrl : b.cover_url,
                    bgm_url: settings.bgmUrl !== undefined ? settings.bgmUrl : b.bgm_url
                }
            }
            return b
        }))
    }

    const handleShareBook = async (e: React.MouseEvent, book: BookRow) => {
        e.preventDefault()
        e.stopPropagation()

        if (!book.is_public) {
            setShareModal({
                isOpen: true,
                title: '공유 불가',
                message: '비공개 프로젝트입니다. 설정에서 공개로 전환 후 공유해주세요.',
                type: 'danger'
            })
            return
        }

        const shareUrl = `${window.location.origin}/view/${book.id}`
        try {
            await navigator.clipboard.writeText(shareUrl)
            setShareModal({
                isOpen: true,
                title: '링크 복사 완료! 🎉',
                message: `공유 링크가 클립보드에 복사되었습니다!\n${shareUrl}`,
                type: 'success'
            })
        } catch (err) {
            console.error('Failed to copy:', err)
            setShareModal({
                isOpen: true,
                title: '복사 실패',
                message: '링크 복사에 실패했습니다.',
                type: 'danger'
            })
        }
    }

    return (
        <div className="min-h-screen bg-white pt-24 sm:pt-32 pb-20 px-4 sm:px-8 font-sans text-earth-brown">
            {/* Top Decoration */}
            <div className="absolute top-16 left-0 w-full h-16 z-0 pointer-events-none opacity-50">
                <img
                    src="/assets/bunting_decoration.png"
                    alt="Festival Bunting"
                    className="w-full h-full object-cover object-top mix-blend-multiply"
                />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 w-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="inline-block w-8 h-8 rounded-full bg-carrot-orange text-white flex items-center justify-center font-bold">
                                {user?.email?.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-mustard-yellow font-bold tracking-wider text-sm uppercase">My Studio</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-earth-brown tracking-tight">
                            내 프로젝트
                        </h1>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="text-earth-brown/60 hover:text-tomato-red font-medium text-sm border-b border-transparent hover:border-tomato-red transition-all"
                    >
                        로그아웃
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-earth-brown/40 animate-pulse">
                        <span className="text-4xl block mb-2">📚</span>
                        서재를 정리하고 있어요...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div
                            onClick={() => setCreationModalOpen(true)}
                            className="
                            bg-brand-purple/5 border-2 border-brand-purple/20 rounded-[2.5rem] 
                            flex flex-col items-center justify-center h-[360px] cursor-pointer
                            hover:bg-brand-purple/10 hover:border-brand-purple/40 hover:scale-[1.02]
                            transition-all group duration-300 relative overflow-hidden
                        ">
                            <div className="w-16 h-16 rounded-3xl bg-brand-purple text-white flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </div>
                            <h3 className="font-black text-2xl text-earth-brown mb-2 tracking-tight">새 프로젝트</h3>
                            <p className="text-earth-brown/60 text-sm text-center px-8 leading-relaxed">
                                이미지, PDF 또는 빈 캔버스로<br />자유롭게 시작하세요
                            </p>
                        </div>

                        {/* Existing Books */}
                        {books.map(book => (
                            <div key={book.id} className="group relative bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-[360px] flex flex-col border border-gray-100 overflow-hidden">
                                <Link
                                    to={`/edit/${book.id}`}
                                    className="flex-1 bg-warm-cream/50 cursor-pointer relative flex items-center justify-center overflow-hidden"
                                >
                                    <div className="w-32 h-44 bg-earth-brown rounded-r shadow-lg transform group-hover:scale-105 group-hover:rotate-2 transition-transform duration-500 relative overflow-hidden">
                                        {book.cover_url ? (
                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 border-l-2 border-white/10 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>
                                                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                                                    <span className="text-white/60 text-xs font-serif italic truncate w-full">{book.title}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Private Badge */}
                                    {book.password_hash && (
                                        <div className="absolute top-4 right-4 text-earth-brown/40" title="비공개">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </Link>

                                <div className="p-5 bg-white relative z-10">
                                    <h3
                                        className="font-bold text-lg text-earth-brown truncate mb-1 cursor-pointer hover:text-carrot-orange transition-colors"
                                        onClick={(e) => handleEditTitle(e, book)}
                                        title="클릭하여 이름 변경"
                                    >
                                        {book.title}
                                    </h3>
                                    <p className="text-xs text-earth-brown/50 font-mono mb-4">
                                        {new Date(book.created_at).toLocaleDateString()}
                                    </p>

                                    <div className="flex gap-2">
                                        <Link
                                            to={`/edit/${book.id}`}
                                            className="flex-1 py-2.5 bg-mustard-yellow text-white text-sm font-bold rounded-xl text-center shadow-[0_2px_0_#d97706] active:translate-y-[2px] active:shadow-none hover:bg-yellow-500 transition-all"
                                        >
                                            편집
                                        </Link>
                                        <button
                                            onClick={(e) => handleShareBook(e, book)}
                                            className="w-10 flex items-center justify-center bg-gray-100 text-earth-brown rounded-xl hover:bg-gray-200 transition-colors"
                                            title="공유하기"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleOpenSettings(e, book)}
                                            className="w-10 flex items-center justify-center bg-gray-100 text-earth-brown rounded-xl hover:bg-gray-200 transition-colors"
                                            title="설정"
                                        >
                                            ⚙️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Settings Modal */}
                {settingsModalOpen && selectedBookForSettings && (
                    <BookSettingsModal
                        isOpen={settingsModalOpen}
                        onClose={() => {
                            setSettingsModalOpen(false)
                            setSelectedBookForSettings(null)
                        }}
                        book={selectedBookForSettings}
                        onSave={handleSaveSettings}
                        onDelete={handleDeleteBook}
                    />
                )}

                {/* Unified Creation Modal */}
                <CreationModal
                    isOpen={creationModalOpen}
                    onClose={() => setCreationModalOpen(false)}
                    onModeSelect={handleModeSelect}
                    isCreating={creating}
                    progress={progress}
                />

                {/* Bulk Image Upload Modal */}
                <ImageUploadModal
                    isOpen={imageModalOpen}
                    onClose={() => setImageModalOpen(false)}
                    initialFiles={selectedFiles}
                    onUpload={handleImageUpload}
                    isUploading={creating}
                />

                {/* Title Input Modal */}
                <TitleInputModal
                    isOpen={titleModalOpen}
                    onClose={() => setTitleModalOpen(false)}
                    onConfirm={(title) => {
                        if (titleModalConfig.type === 'create' && titleModalConfig.mode === 'image') {
                            executeImageCreation(title)
                            setTitleModalOpen(false)
                        } else {
                            handleTitleConfirm(title)
                        }
                    }}
                    initialTitle={titleModalConfig.initialValue}
                    title={titleModalConfig.title}
                />

                {/* Share Alert Modal */}
                <Modal
                    isOpen={shareModal.isOpen}
                    onClose={() => setShareModal(prev => ({ ...prev, isOpen: false }))}
                    title={shareModal.title}
                    type={shareModal.type}
                    actions={
                        <button
                            onClick={() => setShareModal(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 bg-brand-purple text-white rounded-lg font-bold hover:bg-indigo-600 transition-colors"
                        >
                            확인
                        </button>
                    }
                >
                    <p className="whitespace-pre-wrap">{shareModal.message}</p>
                </Modal>
            </div>
        </div>
    )

}
