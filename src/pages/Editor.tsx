import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, Image as ImageIcon, MousePointer, Pencil, Eraser, Trash2, Cloud, Check, Loader2, Share2 } from 'lucide-react'
import { useBookStore } from '../store/bookStore'
import { useUIStore } from '../store/uiStore'
import { useEditorStore, EditorTool } from '../store/editorStore'
import { useResponsiveBook } from '../hooks/useResponsive'
import Book from '../components/Book'
import Modal from '../components/Modal'
import AudioController from '../components/AudioController'
import PageManagerModal from '../components/PageManagerModal'
import { useAudio } from '../hooks/useAudio'
import { Database } from '../types/supabase'

type PageData = Database['public']['Tables']['pages']['Row']

export default function Editor() {
    const navigate = useNavigate()
    const { bookId } = useParams()

    // Book Store
    const {
        pages,
        currentLeaf,
        initDummyData,
        fetchBookDetails,
        savePageChanges,
        updatePage,
        title,
        setTitle,
        updateBookTitle,
        isPublic,
        resetBook,
        bookType
    } = useBookStore()

    // UI Store
    const { scale, setLoading, isLoading, showPageNumbers, setShowPageNumbers } = useUIStore()

    // Editor Store
    const {
        selectedLayerId,
        setSelectedLayer,
        activeTool,
        setActiveTool,
        brushColor,
        brushWidth,
        setBrushColor,
        setBrushWidth,
        resetEditor
    } = useEditorStore()

    // Audio
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
        changeSfxVolume,
        typingSpeed,
        changeTypingSpeed,
        isTypewriterEnabled,
        toggleTypewriter
    } = useAudio()

    useResponsiveBook()

    // Local State
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [targetPageSide, setTargetPageSide] = useState<'left' | 'right' | null>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isPageMenuOpen, setIsPageMenuOpen] = useState(false)
    const [uploadType, setUploadType] = useState<'page' | 'cover' | 'bgm'>('page')
    const [canvasCommand, setCanvasCommand] = useState<{ type: string; payload?: any; timestamp: number } | null>(null)
    const [isBrushMenuOpen, setIsBrushMenuOpen] = useState(false)
    const [showUploadPageSelector, setShowUploadPageSelector] = useState(false)

    const [isDeleting, setIsDeleting] = useState(false)
    const [isPageManagerOpen, setIsPageManagerOpen] = useState(false)

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean
        type: 'default' | 'danger' | 'success'
        title: string
        message: string
        action: 'confirm_upload' | 'info' | 'confirm_delete'
    }>({
        isOpen: false,
        type: 'default',
        title: '',
        message: '',
        action: 'info'
    })

    const [pendingUpload, setPendingUpload] = useState<{
        file: File
        targetIndex: number
        pageNumber: number
        pageId: string
        imageFit: 'cover' | 'contain'

    } | null>(null)

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'saving' | 'error'>('idle')

    // Interaction Lock - disable page flip when editing
    // For Storybook, we don't use Fabric's selectedLayerId or activeTool in the same way
    const isLocked = bookType === 'storybook'
        ? (modalConfig.isOpen || isSettingsOpen)
        : (!!selectedLayerId || modalConfig.isOpen || isSettingsOpen || activeTool !== 'select')

    // Keyboard Navigation & Interaction Lock
    useEffect(() => {
        // When locked, strict blocking of navigation keys
        if (isLocked) {
            const handleBlockedKeys = (e: KeyboardEvent) => {
                const blockedKeys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']
                const target = e.target as HTMLElement
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

                if (blockedKeys.includes(e.key)) {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }
            window.addEventListener('keydown', handleBlockedKeys, true)
            return () => window.removeEventListener('keydown', handleBlockedKeys, true)
        }
    }, [isLocked])

    // Initialize book data
    useEffect(() => {
        const loadBook = async () => {
            if (!bookId || bookId === 'new') {
                resetBook()
                resetEditor()
                initDummyData()
                return
            }

            try {
                setLoading(true)
                resetBook()
                resetEditor()
                await fetchBookDetails(bookId)

                // Preload Images
                const state = useBookStore.getState()
                const imageUrls = [
                    state.coverUrl,
                    ...state.pages.map(p => p.media_url)
                ].filter(Boolean) as string[]

                if (imageUrls.length > 0) {
                    await Promise.all(imageUrls.map(url => {
                        return new Promise((resolve) => {
                            const img = new Image()
                            img.onload = resolve
                            img.onerror = resolve
                            img.src = url
                        })
                    }))
                }

            } catch (error) {
                console.error("Failed to load book:", error)
                alert("책을 불러오는 중 오류가 발생했습니다.")
            } finally {
                setLoading(false)
            }
        }

        loadBook()
    }, [bookId, fetchBookDetails, resetBook, resetEditor, initDummyData, setLoading])

    // Get current page based on side and currentLeaf
    const getTargetPage = (side: 'left' | 'right'): PageData | null => {
        let targetIndex = -1
        if (side === 'left') {
            targetIndex = (currentLeaf - 1) * 2 + 1
        } else {
            targetIndex = currentLeaf * 2
        }
        if (targetIndex < 0 || targetIndex >= pages.length) return null
        return pages[targetIndex]
    }



    // Handle file change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (uploadType === 'cover') {
            setPendingUpload({ file, targetIndex: -1, pageNumber: 0, pageId: 'cover', imageFit: 'cover' })
            setModalConfig({
                isOpen: true,
                type: 'default',
                title: '커버 이미지 업로드',
                message: '선택한 이미지를 책 커버로 설정하시겠습니까?',
                action: 'confirm_upload'
            })
            return
        }

        if (uploadType === 'bgm') {
            setPendingUpload({ file, targetIndex: -1, pageNumber: 0, pageId: 'bgm', imageFit: 'cover' })
            setModalConfig({
                isOpen: true,
                type: 'default',
                title: '배경음악 업로드',
                message: '선택한 파일을 배경음악으로 설정하시겠습니까?',
                action: 'confirm_upload'
            })
            return
        }

        if (!targetPageSide) return

        const targetPage = getTargetPage(targetPageSide)
        if (!targetPage) return

        setPendingUpload({
            file,
            targetIndex: pages.indexOf(targetPage),
            pageNumber: targetPage.page_number,
            pageId: targetPage.id,
            imageFit: 'contain'
        })
        setShowUploadPageSelector(true)
    }

    // Process upload
    const processUpload = async () => {
        if (!pendingUpload) return

        try {
            setModalConfig(prev => ({ ...prev, isOpen: false }))
            setShowUploadPageSelector(false)
            setLoading(true)

            const { uploadMedia } = await import('../services/storageService')
            let publicUrl = ''

            if (uploadType === 'bgm') {
                // Fix: Use 'uploads' bucket instead of 'audio'
                const { data: { user } } = await import('../lib/supabase').then(m => m.supabase.auth.getUser())
                const folderPath = (user && bookId) ? `${user.id}/${bookId}/bgm` : ''
                publicUrl = await uploadMedia(pendingUpload.file, 'uploads', folderPath)
            } else {
                const { optimizeImage } = await import('../services/imageOptimizer')
                const optimizedFile = await optimizeImage(pendingUpload.file)
                publicUrl = await uploadMedia(optimizedFile)
            }

            if (!publicUrl) throw new Error('Upload failed')

            if (uploadType === 'cover') {
                if (bookId) await useBookStore.getState().updateBookSettings(bookId, { isPublic: useBookStore.getState().isPublic, coverUrl: publicUrl })
            } else if (uploadType === 'bgm') {
                if (bookId) await useBookStore.getState().updateBookSettings(bookId, { isPublic: useBookStore.getState().isPublic, bgmUrl: publicUrl })
            } else {
                // Dynamic handling based on book type
                if (useBookStore.getState().bookType === 'storybook') {
                    // For storybook, we replace the main image
                    if (bookId) await useBookStore.getState().savePageChanges(pendingUpload.pageId, { media_url: publicUrl })
                } else {
                    setCanvasCommand({
                        type: 'add-image',
                        payload: { url: publicUrl, pageId: pendingUpload.pageId, fit: pendingUpload.imageFit },
                        timestamp: Date.now()
                    })
                }
            }

            setModalConfig({
                isOpen: true,
                type: 'success',
                title: '업로드 성공!',
                message: '성공적으로 추가되었습니다.',
                action: 'info'
            })
        } catch (error: any) {
            console.error(error)
            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '업로드 실패',
                message: `오류가 발생했습니다.\n(${error?.message || 'Unknown'})`,
                action: 'info'
            })
        } finally {
            setLoading(false)
            setPendingUpload(null)
            setTargetPageSide(null)
        }
    }



    // Delete selected layer
    const handleDeleteLayer = () => {
        setCanvasCommand({
            type: 'delete-selected',
            timestamp: Date.now()
        })
        setSelectedLayer(null)
    }

    // Delete project
    const handleDeleteProject = () => {
        if (!bookId) return
        setModalConfig({
            isOpen: true,
            type: 'danger',
            title: '프로젝트 삭제',
            message: '정말로 이 프로젝트를 삭제하시겠습니까?\n\n모든 데이터가 영구히 삭제되며 복구할 수 없습니다.',
            action: 'confirm_delete'
        })
    }

    const executeDeleteProject = async () => {
        if (!bookId) return
        try {
            closeModal()
            setLoading(true)
            setIsDeleting(true)
            await new Promise(resolve => setTimeout(resolve, 100))
            await useBookStore.getState().deleteBook(bookId)
            navigate('/dashboard')
        } catch (error) {
            console.error('Failed to delete project:', error)
            alert('프로젝트 삭제 중 오류가 발생했습니다.')
            setIsDeleting(false)
            setLoading(false)
        }
    }

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        if (modalConfig.action === 'confirm_upload') {
            setPendingUpload(null)
            setTargetPageSide(null)
            setShowUploadPageSelector(false)
        }
    }

    // Debounced save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const handleUpdateLayers = useCallback((pageId: string, fabricJson: any) => {
        updatePage(pageId, { text_layers: fabricJson })
        setSaveStatus('saving')

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await savePageChanges(pageId, { text_layers: fabricJson })
                setSaveStatus('saved')

                // Reset to idle after 3 seconds
                setTimeout(() => {
                    setSaveStatus('idle')
                }, 3000)
            } catch (e) {
                setSaveStatus('error')
            }
        }, 1000)
    }, [updatePage, savePageChanges])

    // Tool button component
    const ToolButton = ({ tool, icon: Icon, label }: { tool: EditorTool; icon: any; label: string }) => (
        <button
            onClick={() => setActiveTool(tool)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${activeTool === tool
                ? 'bg-brand-purple text-white shadow-md'
                : 'hover:bg-white text-gray-500 hover:text-brand-purple'
                }`}
            title={label}
        >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-bold hidden sm:inline">{label}</span>
        </button>
    )

    const handleShareProject = async () => {
        if (!bookId || !isPublic) {
            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '공유 불가',
                message: '이 프로젝트는 비공개 상태입니다.\n설정에서 공개로 전환해주세요.',
                action: 'info'
            })
            // Open settings panel for convenience
            setIsSettingsOpen(true)
            return
        }

        const shareUrl = `${window.location.origin}/view/${bookId}`
        try {
            await navigator.clipboard.writeText(shareUrl)
            setModalConfig({
                isOpen: true,
                type: 'success',
                title: '링크 복사 완료! 🎉',
                message: `공유 링크가 클립보드에 복사되었습니다!\n${shareUrl}`,
                action: 'info'
            })
        } catch (err) {
            console.error('Failed to copy:', err)
            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '복사 실패',
                message: '링크 복사에 실패했습니다.',
                action: 'info'
            })
        }
    }

    return (
        <div className="h-screen flex flex-col bg-warm-cream overflow-hidden font-sans text-earth-brown">
            {/* Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F39233 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            {/* Header */}
            <header className="h-16 bg-white/90 backdrop-blur-md border-b border-mustard-yellow/20 flex items-center px-6 justify-between z-10 relative shadow-sm">
                {/* Left Section */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-brand-purple"
                        title="대시보드로 돌아가기"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-[1.5px] bg-gray-200/50" />
                    <h1 className="text-sm sm:text-base font-bold text-gray-700 truncate max-w-[80px] sm:max-w-xs">
                        {title || '무제 프로젝트'}
                    </h1>

                    {/* Page Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setIsPageMenuOpen(!isPageMenuOpen)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200
                                ${isPageMenuOpen ? 'bg-white border-brand-purple text-brand-purple shadow-sm ring-1 ring-brand-purple/20' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-purple/50 hover:text-brand-purple'}`}
                        >
                            <BookOpen className="w-4 h-4" />
                            <span className="text-xs font-bold hidden sm:inline">페이지 설정</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isPageMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isPageMenuOpen && (
                            <div className="absolute top-full left-0 mt-3 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl w-64 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                <div className="space-y-4">
                                    {/* Page Manager Button */}
                                    <button
                                        onClick={() => { setIsPageManagerOpen(true); setIsPageMenuOpen(false); }}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-purple text-white rounded-xl font-bold shadow-md hover:bg-indigo-600 transition-colors text-sm"
                                    >
                                        <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                                            <div className="bg-white/40 rounded-[1px]" />
                                            <div className="bg-white/40 rounded-[1px]" />
                                            <div className="bg-white/40 rounded-[1px]" />
                                            <div className="bg-white/40 rounded-[1px]" />
                                        </div>
                                        전체 페이지 관리
                                    </button>

                                    {/* Layout Toggles */}
                                    <div className="grid grid-cols-1 gap-2 pb-3 border-b border-gray-100">
                                        <button
                                            onClick={() => setShowPageNumbers(!showPageNumbers)}
                                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1
                                                ${showPageNumbers ? 'bg-mustard-yellow/10 border-mustard-yellow text-mustard-yellow' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            <span className="text-[10px] font-bold">페이지 번호</span>
                                            <span className="text-xs font-bold">{showPageNumbers ? 'ON' : 'OFF'}</span>
                                        </button>
                                    </div>

                                    {/* Add/Edit Objects */}
                                    {/* Removed Left/Right Page controls as per user request */}
                                </div>
                            </div>
                        )}
                    </div>
                </div >

                {/* Right Section - Tools */}
                < div className="flex items-center gap-2 sm:gap-4 shrink-0" >
                    {/* Tool Selector - Only show for legacy books or if we decide to keep drawing in storybook (currently disabled for storybook) */}
                    {/* For now, we hide drawing tools for Storybook mode as it uses strict layout */}
                    {
                        useBookStore.getState().bookType !== 'storybook' && useBookStore.getState().bookType !== 'image' && useBookStore.getState().bookType !== 'pdf' && (
                            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl border border-gray-200/50 shadow-inner">
                                <ToolButton tool="select" icon={MousePointer} label="선택" />
                                <ToolButton tool="draw" icon={Pencil} label="그리기" />
                                <ToolButton tool="eraser" icon={Eraser} label="지우개" />
                            </div>
                        )
                    }

                    {/* Brush Settings (when drawing/eraser active) */}
                    {
                        (activeTool === 'draw' || activeTool === 'eraser') && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsBrushMenuOpen(!isBrushMenuOpen)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200
                                    ${isBrushMenuOpen ? 'bg-white border-brand-purple text-brand-purple' : 'bg-white border-gray-200 text-gray-600'}`}
                                >
                                    <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: activeTool === 'eraser' ? '#ffffff' : brushColor }} />
                                    <span className="text-xs font-bold">{brushWidth}px</span>
                                </button>

                                {isBrushMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-200 shadow-xl rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200 min-w-[200px]">
                                        <div className="space-y-4">
                                            {activeTool === 'draw' && (
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 mb-2 block">색상</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['#374151', '#F87171', '#60A5FA', '#34D399', '#FBBF24', '#A855F7'].map(c => (
                                                            <button
                                                                key={c}
                                                                onClick={() => setBrushColor(c)}
                                                                className={`w-6 h-6 rounded-full border-2 transition-transform ${brushColor === c ? 'border-brand-purple scale-110' : 'border-transparent'}`}
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                        <input
                                                            type="color"
                                                            value={brushColor}
                                                            onChange={e => setBrushColor(e.target.value)}
                                                            className="w-6 h-6 rounded-full overflow-hidden cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 mb-2 block">두께: {brushWidth}px</label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="50"
                                                    value={brushWidth}
                                                    onChange={e => setBrushWidth(parseInt(e.target.value))}
                                                    className="w-full h-2 bg-gray-100 rounded-lg accent-brand-purple"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* Delete Button (when layer selected) */}
                    {
                        selectedLayerId && (
                            <button
                                onClick={handleDeleteLayer}
                                className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm"
                                title="선택 삭제"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )
                    }

                    <div className="h-6 w-px bg-gray-200/50 mx-1" />

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
                        typingSpeed={typingSpeed}
                        changeTypingSpeed={changeTypingSpeed}
                        isTypewriterEnabled={isTypewriterEnabled}
                        toggleTypewriter={toggleTypewriter}
                        bookType={bookType}
                    />

                    <button
                        onClick={() => bookId && useBookStore.getState().addNewPage(bookId)}
                        className="px-4 py-2 bg-white border border-gray-200 text-earth-brown rounded-xl hover:bg-warm-cream hover:border-earth-brown/20 transition text-sm font-bold shrink-0 hidden sm:inline"
                    >
                        + 페이지 추가
                    </button>

                    <button
                        onClick={handleShareProject}
                        className="p-2 rounded-xl transition shadow-sm border-2 bg-white text-earth-brown border-transparent hover:border-brand-purple/20 hidden sm:block"
                        title="공유하기"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className={`p-2 rounded-xl transition shadow-sm border-2 ${isSettingsOpen ? 'bg-brand-purple text-white border-brand-purple' : 'bg-white text-earth-brown border-transparent hover:border-brand-purple/20'}`}
                        title="책 설정"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.448.27 1.06-.12 1.45l-.772.773a1.125 1.125 0 01-1.45.12l-.737-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {saveStatus !== 'idle' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-xs font-medium text-gray-500 transition-all animate-in fade-in slide-in-from-right-4">
                            {saveStatus === 'saving' ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin text-brand-purple" />
                                    <span className="text-brand-purple">저장 중...</span>
                                </>
                            ) : saveStatus === 'saved' ? (
                                <>
                                    <Check className="w-3 h-3 text-green-500" />
                                    <span>저장됨</span>
                                </>
                            ) : (
                                <>
                                    <Cloud className="w-3 h-3 text-red-400" />
                                    <span className="text-red-400">저장 실패</span>
                                </>
                            )}
                        </div>
                    )}
                </div >
            </header >

            {/* Main Content */}
            < main className="flex-1 flex items-center justify-center relative overflow-hidden" >
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                        <div className="bg-white px-8 py-6 rounded-[2rem] shadow-xl flex flex-col items-center gap-4 border-2 border-mustard-yellow/20">
                            <div className="w-10 h-10 border-4 border-mustard-yellow border-t-transparent rounded-full animate-spin" />
                            <span className="font-bold text-earth-brown animate-pulse">잠시만 기다려주세요...</span>
                        </div>
                    </div>
                )
                }

                {
                    !isDeleting && (
                        <div style={{ transform: `scale(${scale})` }} className="transition-transform duration-300 drop-shadow-2xl">
                            <Book
                                command={canvasCommand || undefined}
                                isLocked={isLocked}
                                onUpdateLayers={handleUpdateLayers}
                                onFlipPage={playPageFlip}
                                typingSpeed={typingSpeed}
                                isTypewriterEnabled={isTypewriterEnabled}
                                onPageClick={() => {
                                    // Quick add on page click when in select mode
                                    // Could implement quick-add menu here
                                }}
                            />
                        </div>
                    )
                }



                {/* Upload Page Selector Modal */}
                <Modal
                    isOpen={showUploadPageSelector}
                    onClose={() => {
                        setShowUploadPageSelector(false)
                        setPendingUpload(null)
                    }}
                    title="이미지 업로드 확인"
                    actions={
                        <>
                            <button
                                onClick={() => {
                                    setShowUploadPageSelector(false)
                                    setPendingUpload(null)
                                }}
                                className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors font-medium text-sm"
                            >
                                취소
                            </button>
                            <button
                                onClick={processUpload}
                                className="px-4 py-2 rounded-lg bg-brand-purple text-white hover:bg-indigo-600 transition-colors font-bold text-sm shadow-md"
                            >
                                업로드 하기
                            </button>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-earth-brown/80 font-medium">선택한 이미지를 업로드할 페이지와 옵션을 확인해주세요.</p>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-4">
                            <div className="flex gap-4 items-center justify-center bg-white p-3 rounded-lg border border-gray-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="imageFit"
                                        checked={pendingUpload?.imageFit === 'contain'}
                                        onChange={() => setPendingUpload(prev => prev ? { ...prev, imageFit: 'contain' } : null)}
                                        className="accent-brand-purple"
                                    />
                                    <span className="text-sm font-medium">크기에 맞게</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="imageFit"
                                        checked={pendingUpload?.imageFit === 'cover'}
                                        onChange={() => setPendingUpload(prev => prev ? { ...prev, imageFit: 'cover' } : null)}
                                        className="accent-brand-purple"
                                    />
                                    <span className="text-sm font-medium">꽉 차게</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-4">
                                {pendingUpload?.file && (
                                    <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0">
                                        <img
                                            src={URL.createObjectURL(pendingUpload.file)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">대상 페이지</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-earth-brown">Page {pendingUpload?.pageNumber || 1}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            </main >

            <PageManagerModal
                isOpen={isPageManagerOpen}
                onClose={() => setIsPageManagerOpen(false)}
            />

            {/* Edit Mode Indicator */}
            {
                isLocked && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-brand-purple text-white shadow-xl rounded-full px-5 py-2 flex items-center gap-3 z-50 animate-in fade-in slide-in-from-top-4 border border-white/20">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {activeTool === 'draw' ? '그리기 모드' : activeTool === 'eraser' ? '지우개 모드' : '편집 모드'}
                        </span>
                        <span className="text-[10px] opacity-80 border-l border-white/20 pl-3">페이지 잠금됨</span>

                        {selectedLayerId && (
                            <button
                                onClick={handleDeleteLayer}
                                className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500 text-white transition-all"
                                title="선택 요소 삭제"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setActiveTool('select')
                                setSelectedLayer(null)
                            }}
                            className="ml-2 px-3 py-1 rounded-full bg-white/20 hover:bg-white hover:text-brand-purple text-white text-xs font-bold transition-all"
                        >
                            완료
                        </button>
                    </div>
                )
            }

            {/* Settings Side Panel */}
            <aside
                className={`fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out border-l border-gray-100 flex flex-col
                    ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-bold text-earth-brown flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-brand-purple">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.448.27 1.06-.12 1.45l-.772.773a1.125 1.125 0 01-1.45.12l-.737-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        책 설정
                    </h2>
                    <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                    {/* Title Input */}
                    <section>
                        <label className="text-sm font-bold text-earth-brown block mb-2">프로젝트 이름</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => {
                                if (bookId && title.trim()) {
                                    updateBookTitle(bookId, title)
                                }
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none font-bold text-gray-800"
                            placeholder="프로젝트 이름을 입력하세요"
                        />
                    </section>

                    {/* Public Toggle */}
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-earth-brown">공개 여부</label>
                            <button
                                onClick={() => {
                                    if (bookId) useBookStore.getState().updateBookSettings(bookId, { isPublic: !isPublic })
                                }}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-brand-purple' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">책을 공개하면 누구나 볼 수 있습니다.</p>
                    </section>

                    {/* Cover Image */}
                    <section className="flex flex-col gap-3">
                        <label className="text-sm font-bold text-earth-brown underline decoration-brand-purple/30 underline-offset-4">커버 이미지</label>
                        <div
                            onClick={() => {
                                setUploadType('cover')
                                if (fileInputRef.current) {
                                    fileInputRef.current.accept = 'image/*'
                                    fileInputRef.current.click()
                                }
                            }}
                            className="aspect-[3/4] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand-purple/30 hover:bg-brand-purple/5 transition-all group relative overflow-hidden"
                        >
                            {useBookStore.getState().coverUrl ? (
                                <>
                                    <img src={useBookStore.getState().coverUrl!} alt="Cover" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-xs font-bold px-3 py-1.5 bg-black/20 backdrop-blur rounded-full border border-white/30">이미지 변경</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-brand-purple transition-colors">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400">커버 이미지 업로드</span>
                                </>
                            )}
                        </div>
                    </section>

                    {/* BGM */}
                    <section className="flex flex-col gap-3">
                        <label className="text-sm font-bold text-earth-brown underline decoration-brand-purple/30 underline-offset-4">배경 음악 (BGM)</label>
                        <div
                            onClick={() => {
                                setUploadType('bgm')
                                if (fileInputRef.current) {
                                    fileInputRef.current.accept = 'audio/*'
                                    fileInputRef.current.click()
                                }
                            }}
                            className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center gap-4 cursor-pointer hover:border-brand-purple/30 hover:bg-brand-purple/5 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-brand-purple transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6v6a2.25 2.25 0 01-2.25 2.25h-.75A2.25 2.25 0 0114.25 18V9m0 6V6.75A.75.75 0 0114.25 6h.75a2.25 2.25 0 012.25 2.25V9M9 9v9a2.25 2.25 0 01-2.25 2.25h-.75A2.25 2.25 0 013.75 18v-9" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-earth-brown">BGM 업로드</span>
                                <span className="text-[10px] text-gray-400">
                                    {useBookStore.getState().bgmUrl ? '업로드된 파일 있음' : 'MP3, AAC 지원'}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Delete Project */}
                    <section className="mt-8 pt-8 border-t border-red-50 flex flex-col gap-3">
                        <label className="text-xs font-bold text-red-400 uppercase tracking-widest">Danger Zone</label>
                        <button
                            onClick={handleDeleteProject}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 group border border-red-100 hover:border-red-200"
                        >
                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold">프로젝트 영구 삭제</span>
                        </button>
                        <p className="text-[10px] text-red-400/60 text-center leading-relaxed italic">
                            삭제 후에는 데이터를 절대 복구할 수 없습니다.
                        </p>
                    </section>
                </div>

                <div className="p-6 border-t border-gray-100">
                    <p className="text-[10px] text-center text-gray-300 font-medium">Flipbook Pro - Book Engine v2.0</p>
                </div>
            </aside>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Global Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                type={modalConfig.type}
                actions={
                    modalConfig.action === 'confirm_upload' ? (
                        <>
                            <button onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium">취소</button>
                            <button onClick={processUpload} className="px-4 py-2 bg-brand-purple text-white hover:bg-indigo-600 rounded-lg transition shadow-sm text-sm font-bold">업로드 하기</button>
                        </>
                    ) : modalConfig.action === 'confirm_delete' ? (
                        <>
                            <button onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium">취소</button>
                            <button onClick={executeDeleteProject} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition shadow-sm text-sm font-bold">영구 삭제하기</button>
                        </>
                    ) : (
                        <button onClick={closeModal} className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition text-sm font-bold">확인</button>
                    )
                }
            >
                <div className="whitespace-pre-line">{modalConfig.message}</div>
            </Modal>
        </div >
    )
}
