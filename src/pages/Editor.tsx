import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useBookStore } from '../store/bookStore'
import { useUIStore } from '../store/uiStore'
import { useEditorStore, TextLayer } from '../store/editorStore'
import { useResponsiveBook } from '../hooks/useResponsive'
import Book from '../components/Book'
import Modal from '../components/Modal'
import AudioController from '../components/AudioController'
import { useAudio } from '../hooks/useAudio'
import { Database } from '../types/supabase'

type PageData = Database['public']['Tables']['pages']['Row'] & { image_fit?: 'cover' | 'contain' }

const generateId = () => Math.random().toString(36).substr(2, 9)

// Font Options
const fontOptions = [
    { label: '기본 고딕 (Noto Sans)', value: '"Noto Sans KR", sans-serif' },
    { label: '나눔 명조 (Nanum)', value: '"Nanum Myeongjo", serif' },
    { label: '고운 돋움 (Gowun)', value: '"Gowun Dodum", sans-serif' },
    { label: '검은 고딕 (Black Han)', value: '"Black Han Sans", sans-serif' },
    { label: '나눔 펜 (Pen Script)', value: '"Nanum Pen Script", cursive' },
    { label: '동글 (Dongle)', value: '"Dongle", sans-serif' },
]

export default function Editor() {
    const { bookId } = useParams()
    const {
        pages,
        currentLeaf,
        totalLeaves,
        initDummyData,
        fetchBookDetails,
        savePageChanges,
        updatePage, // Import updatePage
        isRtl,
        setIsRtl,

        title,
        resetBook
    } = useBookStore()
    const { scale, setLoading, isLoading, showPageNumbers, setShowPageNumbers } = useUIStore()
    const { selectedLayerId, setSelectedLayer } = useEditorStore()
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

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [targetPageSide, setTargetPageSide] = useState<'left' | 'right' | null>(null)
    const [isImageEditMode, setIsImageEditMode] = useState(false)


    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean
        type: 'default' | 'danger' | 'success'
        title: string
        message: string
        action: 'confirm_upload' | 'edit_page' | 'info'
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

    const [editState, setEditState] = useState<{
        page: PageData
        newFit: 'cover' | 'contain'
    } | null>(null)

    // ... (rest of code)





    useEffect(() => {
        resetBook() // Clear previous book data to prevent ghost images
        if (bookId && bookId !== 'new') {
            fetchBookDetails(bookId)
        } else {
            initDummyData()
        }
    }, [bookId, fetchBookDetails, resetBook])

    const handleUploadClick = (side: 'left' | 'right') => {
        setTargetPageSide(side)
        if (fileInputRef.current) {
            fileInputRef.current.value = '' // Reset input
            fileInputRef.current.click()
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !targetPageSide) return

        // Calculate Target Index
        let targetIndex = -1
        if (targetPageSide === 'left') {
            targetIndex = (currentLeaf - 1) * 2 + 1
        } else {
            targetIndex = currentLeaf * 2
        }

        // Boundary check
        if (targetIndex < 0 || targetIndex >= pages.length) {
            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '오류',
                message: '해당 위치에 페이지가 존재하지 않습니다.',
                action: 'info'
            })
            return
        }

        const targetPage = pages[targetIndex]

        // Prepare Confirmation Modal
        setPendingUpload({
            file,
            targetIndex,
            pageNumber: targetPage.page_number,
            pageId: targetPage.id,
            imageFit: 'cover'
        })

        setModalConfig({
            isOpen: true,
            type: 'default',
            title: '이미지 업로드 확인',
            message: `페이지 ${targetPage.page_number}에 선택한 이미지를 업로드하시겠습니까?`,
            action: 'confirm_upload'
        })
    }

    const processUpload = async () => {
        if (!pendingUpload) return

        try {
            setModalConfig(prev => ({ ...prev, isOpen: false })) // Close confirm modal
            setLoading(true)

            // 1. Optimize & Upload
            const { optimizeImage } = await import('../services/imageOptimizer')
            const { uploadMedia } = await import('../services/storageService')

            const optimizedFile = await optimizeImage(pendingUpload.file)
            const publicUrl = await uploadMedia(optimizedFile)

            if (!publicUrl) {
                throw new Error("Upload return null")
            }

            // 2. Update DB & Store
            await savePageChanges(pendingUpload.pageId, {
                media_url: publicUrl,
                media_type: 'image',
                image_fit: pendingUpload.imageFit as 'cover' | 'contain' // Cast to specific string union
            })

            // Force refresh (preserve page)
            if (bookId) await fetchBookDetails(bookId, true)

            // Success Modal
            setModalConfig({
                isOpen: true,
                type: 'success',
                title: '업로드 성공!',
                message: `페이지 ${pendingUpload.pageNumber}에 이미지가 성공적으로 반영되었습니다.`,
                action: 'info' // Just an OK button
            })

        } catch (error: any) {
            console.error(error)
            const msg = error?.message || "Unknown error"

            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '업로드 실패',
                message: `이미지 업로드 중 오류가 발생했습니다.\n(${msg})`,
                action: 'info'
            })
        } finally {
            setLoading(false)
            setPendingUpload(null)
            setTargetPageSide(null)
        }
    }

    const handleEditPage = (page: PageData) => {
        setEditState({
            page,
            newFit: page.image_fit || 'cover'
        })
        setModalConfig({
            isOpen: true,
            type: 'default',
            title: '페이지 편집',
            message: `페이지 ${page.page_number} 설정을 변경합니다.`,
            action: 'edit_page'
        })
    }

    const saveEdit = async () => {
        if (!editState) return

        try {
            setModalConfig(prev => ({ ...prev, isOpen: false }))
            setLoading(true)

            await savePageChanges(editState.page.id, {
                image_fit: editState.newFit
            })

            // Force refresh
            if (bookId) await fetchBookDetails(bookId, true)

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
            setEditState(null)
        }
    }

    // Helper to find selected layer object
    const getSelectedLayer = () => {
        if (!selectedLayerId) return null
        for (const page of pages) {
            const layers = Array.isArray(page.text_layers) ? page.text_layers as unknown as TextLayer[] : []
            const layer = layers.find(l => l.id === selectedLayerId)
            if (layer) return { layer, pageId: page.id }
        }
        return null
    }

    const selectedLayerData = getSelectedLayer()


    const handleReplaceImage = () => {
        if (!editState) return
        // Determine side based on page number logic roughly, or just find index
        const index = pages.findIndex(p => p.id === editState.page.id)
        if (index === -1) return

        // Even index (0, 2...) -> Right (LTR). Odd (1, 3...) -> Left (LTR).
        // If RTL: Even -> Left. Odd -> Right.
        const isEven = index % 2 === 0
        const side = isRtl ? (isEven ? 'left' : 'right') : (isEven ? 'right' : 'left')

        setTargetPageSide(side)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
            fileInputRef.current.click()
        }
        closeModal() // Close edit modal
    }

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }))
        // If canceling upload confirm, clear pending
        if (modalConfig.action === 'confirm_upload') {
            setPendingUpload(null)
            setTargetPageSide(null)
        }
        if (modalConfig.action === 'edit_page') {
            setEditState(null)
        }
    }

    const handleUpdateLayer = async (pageId: string, updatedLayer: TextLayer) => {
        // Optimistic Text Update (Local Only)
        // This makes dragging smooth as butter 🧈
        // We DO NOT save to DB here. Saving happens on deselect.

        const pageIndex = pages.findIndex(p => p.id === pageId)
        if (pageIndex === -1) return

        const page = pages[pageIndex]
        const currentLayers = Array.isArray(page.text_layers) ? page.text_layers as unknown as TextLayer[] : []
        const newLayers = currentLayers.map(l => l.id === updatedLayer.id ? updatedLayer : l)

        // Update Store State Only
        updatePage(pageId, { text_layers: newLayers as any })
    }

    // Also handle "Click outside" for deselecting?
    // Currently Page.tsx handles click outside to deselect.
    // We need to ensure that when Page.tsx calls 'setSelectedLayer(null)', we actually trigger save.
    // PROBLEM: Page.tsx calls setSelectedLayer directly.
    // SOLUTION: We should pass a 'onDeselect' callback to Book -> Page, OR loop useEffect.
    // Better: Monitor selectedLayerId change? No, previous value issue.
    // Easiest: In this component, we replace the direct setSelectedLayer usage in child components?
    // Page.tsx imports setSelectedLayer from store directly. That's the issue.
    // FIX: We need a "Global Save" effect or wrapper.
    // ACTUALLY: The user said "Edit Mode".
    // Let's rely on the user clicking "Done" or clicking outside.
    // But Page.tsx 'onSelect' logic needs to potentially trigger save if switching layers.

    // Let's attach a listener to 'selectedLayerId' changes?
    // If we change from A to B, we must save A.
    // This requires a "previousSelection" ref in Editor.tsx.

    const prevSelectedLayerId = useRef<string | null>(null)
    useEffect(() => {
        const prevId = prevSelectedLayerId.current

        if (prevId && prevId !== selectedLayerId) {
            // Check if prevId still exists (might be deleted)
            // And save its page.
            const prevPage = pages.find(p => {
                const layers = Array.isArray(p.text_layers) ? p.text_layers as unknown as TextLayer[] : []
                return layers.some(l => l.id === prevId)
            })

            if (prevPage) {
                console.log('Auto-saving previous layer:', prevId)
                savePageChanges(prevPage.id, { text_layers: prevPage.text_layers })
            }
        }

        prevSelectedLayerId.current = selectedLayerId
    }, [selectedLayerId, pages, savePageChanges])

    // Wait, if we use useEffect, we don't need handleDeselect explicitly for buttons?
    // Yes, setting selectedLayerId to null will trigger the effect.
    // EXCEPT: pages dependency might be stale or cause loops?
    // 'pages' updates on drag. If 'pages' is dep, this runs on every drag?
    // YES. We don't want that.
    // We want to run ONLY when selectedLayerId changes.
    // But inside, we need LATEST pages.
    // useRef for pages?

    const pagesRef = useRef(pages)
    useEffect(() => { pagesRef.current = pages }, [pages])

    useEffect(() => {
        const prevId = prevSelectedLayerId.current

        if (prevId && prevId !== selectedLayerId) {
            const currentPages = pagesRef.current
            const prevPage = currentPages.find(p => {
                const layers = Array.isArray(p.text_layers) ? p.text_layers as unknown as TextLayer[] : []
                return layers.some(l => l.id === prevId)
            })

            if (prevPage) {
                savePageChanges(prevPage.id, { text_layers: prevPage.text_layers })
            }
        }
        prevSelectedLayerId.current = selectedLayerId
    }, [selectedLayerId, savePageChanges]) // Removed 'pages' from deps



    const handleAddText = async (side: 'left' | 'right') => {
        let targetIndex = -1
        if (side === 'left') {
            targetIndex = (currentLeaf - 1) * 2 + 1
        } else {
            targetIndex = currentLeaf * 2
        }

        if (targetIndex < 0 || targetIndex >= pages.length) return

        const page = pages[targetIndex]
        const currentLayers = Array.isArray(page.text_layers) ? page.text_layers as unknown as TextLayer[] : []

        const newLayer: TextLayer = {
            id: generateId(),
            text: 'Double click to edit',
            x: 50,
            y: 50,
            fontSize: 24,
            color: '#000000',
            fontFamily: 'sans-serif'
        }

        const newLayers = [...currentLayers, newLayer]

        setLoading(true)
        await savePageChanges(page.id, { text_layers: newLayers as any })
        if (bookId) await fetchBookDetails(bookId, true)
        setLoading(false)

        setSelectedLayer(newLayer.id)
    }

    const handleDeleteLayer = async () => {
        if (!selectedLayerId) return

        // Find the page containing the layer
        const page = pages.find(p => {
            const layers = Array.isArray(p.text_layers) ? p.text_layers as unknown as TextLayer[] : []
            return layers.some(l => l.id === selectedLayerId)
        })

        if (!page) return

        if (confirm('이 텍스트 레이어를 삭제하시겠습니까?')) {
            const currentLayers = Array.isArray(page.text_layers) ? page.text_layers as unknown as TextLayer[] : []
            const newLayers = currentLayers.filter(l => l.id !== selectedLayerId)

            setLoading(true)
            await savePageChanges(page.id, { text_layers: newLayers as any })
            if (bookId) await fetchBookDetails(bookId, true)
            setLoading(false)
            setSelectedLayer(null) // This will trigger auto-save via useEffect
        }
    }

    return (
        <div className="h-screen flex flex-col bg-warm-cream overflow-hidden font-sans text-earth-brown">
            {/* Background Decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#F39233 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            <header className="h-16 bg-white/90 backdrop-blur-md border-b border-mustard-yellow/20 flex items-center px-6 justify-between z-10 relative shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-earth-brown/50 hover:text-carrot-orange transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </Link>
                    <h1 className="font-bold text-lg truncate max-w-[200px] text-earth-brown">
                        {title || '책을 불러오는 중...'}
                    </h1>
                    <div className="h-6 w-px bg-mustard-yellow/20 mx-2"></div>
                    <button
                        onClick={() => setIsRtl(!isRtl)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${isRtl
                            ? 'bg-carrot-orange/10 border-carrot-orange text-carrot-orange'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-carrot-orange hover:text-carrot-orange'
                            }`}
                    >
                        {isRtl ? 'RTL ON' : 'RTL OFF'}
                    </button>
                    <button
                        onClick={() => setShowPageNumbers(!showPageNumbers)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showPageNumbers
                            ? 'bg-mustard-yellow/10 border-mustard-yellow text-mustard-yellow'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-mustard-yellow hover:text-mustard-yellow'
                            }`}
                    >
                        PgNo {showPageNumbers ? 'ON' : 'OFF'}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {/* Media Upload & Text Buttons */}
                    <div className="flex bg-white border border-gray-100 rounded-2xl p-1 mr-2 shadow-sm">
                        <div className="flex items-center">
                            <span className="text-[10px] text-earth-brown/40 font-bold px-2 uppercase tracking-wider">Left</span>
                            <button
                                onClick={() => handleUploadClick('left')}
                                disabled={currentLeaf === 0 || isLoading}
                                className={`p-2 rounded-xl hover:bg-warm-cream text-earth-brown disabled:opacity-30 transition hover:text-carrot-orange`}
                                title="왼쪽 페이지 이미지"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleAddText('left')}
                                disabled={currentLeaf === 0 || isLoading}
                                className={`p-2 rounded-xl hover:bg-warm-cream text-earth-brown disabled:opacity-30 transition hover:text-carrot-orange`}
                                title="왼쪽 페이지 텍스트"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </button>
                        </div>

                        <div className="w-px bg-gray-100 my-1 mx-2"></div>

                        <div className="flex items-center">
                            <span className="text-[10px] text-earth-brown/40 font-bold px-2 uppercase tracking-wider">Right</span>
                            <button
                                onClick={() => handleAddText('right')}
                                disabled={currentLeaf >= totalLeaves || isLoading}
                                className={`p-2 rounded-xl hover:bg-warm-cream text-earth-brown disabled:opacity-30 transition hover:text-carrot-orange`}
                                title="오른쪽 페이지 텍스트"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleUploadClick('right')}
                                disabled={currentLeaf >= totalLeaves || isLoading}
                                className={`p-2 rounded-xl hover:bg-warm-cream text-earth-brown disabled:opacity-30 transition hover:text-carrot-orange`}
                                title="오른쪽 페이지 이미지"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsImageEditMode(!isImageEditMode)}
                        className={`px-4 py-2 rounded-xl hover:bg-mustard-yellow/5 transition text-sm font-bold mr-2 flex items-center gap-2 border-2
                            ${isImageEditMode ? 'bg-mustard-yellow/10 border-mustard-yellow text-mustard-yellow' : 'bg-white border-transparent text-earth-brown/70 hover:border-mustard-yellow/30'}
                        `}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        이미지 편집
                    </button>

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

                    <button
                        onClick={() => {
                            if (bookId) useBookStore.getState().addNewPage(bookId)
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 text-earth-brown rounded-xl hover:bg-warm-cream hover:border-earth-brown/20 transition text-sm font-bold"
                    >
                        + 페이지 추가
                    </button>

                    <button className="px-5 py-2 bg-mustard-yellow text-white rounded-xl hover:bg-yellow-500 transition shadow-[0_3px_0_#d97706] active:translate-y-[2px] active:shadow-none text-sm font-bold">
                        저장
                    </button>
                    {/* Share button can be added later or reusing existing structure */}
                </div>
            </header >

            <main className="flex-1 flex items-center justify-center relative overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                        <div className="bg-white px-8 py-6 rounded-[2rem] shadow-xl flex flex-col items-center gap-4 border-2 border-mustard-yellow/20">
                            <div className="w-10 h-10 border-4 border-mustard-yellow border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-bold text-earth-brown animate-pulse">잠시만 기다려주세요...</span>
                        </div>
                    </div>
                )}

                {/* Book Container with responsive scale */}
                <div style={{ transform: `scale(${scale})` }} className="transition-transform duration-300 drop-shadow-2xl">
                    <Book
                        onEditPage={handleEditPage}
                        onUpdateLayer={async (pageId, layer) => {
                            // For drag performance, we could skip saving every event, but for now:
                            await handleUpdateLayer(pageId, layer)
                        }}
                        isImageEditMode={isImageEditMode}
                        onFlipPage={playPageFlip}
                    />
                </div>
            </main>

            {/* Selected Layer Toolbar */}
            {
                selectedLayerId && selectedLayerData && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full px-5 py-2 flex items-center gap-4 z-50 border border-gray-100 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3 border-r pr-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold text-brand-purple uppercase tracking-tight leading-none">Editing</span>
                                <span className="text-xs font-bold text-gray-800 leading-none">Text</span>
                            </div>



                            {/* Font Family Selector */}
                            <div className="relative group">
                                <select
                                    value={selectedLayerData.layer.fontFamily}
                                    onChange={(e) => handleUpdateLayer(selectedLayerData.pageId, { ...selectedLayerData.layer, fontFamily: e.target.value })}
                                    className="appearance-none bg-gray-100 hover:bg-gray-200 pl-3 pr-8 py-1 rounded-lg text-xs font-medium text-gray-700 outline-none cursor-pointer transition w-[120px] truncate border-r-8 border-transparent"
                                    style={{ fontFamily: selectedLayerData.layer.fontFamily }}
                                >
                                    {fontOptions.map(font => (
                                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Font Size Controls */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                                <button
                                    onClick={() => handleUpdateLayer(selectedLayerData.pageId, { ...selectedLayerData.layer, fontSize: Math.max(12, selectedLayerData.layer.fontSize - 2) })}
                                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-white rounded shadow-sm transition"
                                >
                                    -
                                </button>
                                <span className="text-xs font-medium w-6 text-center">{selectedLayerData.layer.fontSize}</span>
                                <button
                                    onClick={() => handleUpdateLayer(selectedLayerData.pageId, { ...selectedLayerData.layer, fontSize: Math.min(100, selectedLayerData.layer.fontSize + 2) })}
                                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-white rounded shadow-sm transition"
                                >
                                    +
                                </button>
                            </div>

                            {/* Color Picker */}
                            <div className="relative group">
                                <input
                                    type="color"
                                    value={selectedLayerData.layer.color}
                                    onChange={(e) => handleUpdateLayer(selectedLayerData.pageId, { ...selectedLayerData.layer, color: e.target.value })}
                                    className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleDeleteLayer}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-full transition"
                            title="삭제"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                        <div className="text-[10px] text-gray-400 hidden sm:block">
                            * 더블클릭 수정
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-1"></div>

                        <button
                            onClick={() => setSelectedLayer(null)}
                            className="bg-brand-purple text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-600 transition shadow-sm flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            완료
                        </button>
                    </div>
                )
            }

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
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
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={processUpload}
                                className="px-4 py-2 bg-brand-purple text-white hover:bg-indigo-600 rounded-lg transition shadow-sm text-sm font-bold"
                            >
                                업로드 하기
                            </button>
                        </>
                    ) : modalConfig.action === 'edit_page' ? (
                        <>
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={saveEdit}
                                className="px-4 py-2 bg-brand-purple text-white hover:bg-indigo-600 rounded-lg transition shadow-sm text-sm font-bold"
                            >
                                저장
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={closeModal}
                            className="px-4 py-2 bg-gray-900 text-white hover:bg-black rounded-lg transition shadow-sm text-sm font-medium"
                        >
                            확인
                        </button>
                    )
                }
            >
                {modalConfig.action === 'confirm_upload' ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-gray-600 mb-2">{modalConfig.message}</p>

                        {/* Image Fit Selection */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <span className="block text-sm font-semibold text-gray-700 mb-2">이미지 표시 방식</span>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="imageFit"
                                        value="cover"
                                        checked={pendingUpload?.imageFit === 'cover'}
                                        onChange={() => setPendingUpload(prev => prev ? ({ ...prev, imageFit: 'cover' }) : null)}
                                        className="w-4 h-4 text-brand-purple focus:ring-brand-purple"
                                    />
                                    <span className="text-sm text-gray-700">꽉 채우기 (잘림 발생)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="imageFit"
                                        value="contain"
                                        checked={pendingUpload?.imageFit === 'contain'}
                                        onChange={() => setPendingUpload(prev => prev ? ({ ...prev, imageFit: 'contain' }) : null)}
                                        className="w-4 h-4 text-brand-purple focus:ring-brand-purple"
                                    />
                                    <span className="text-sm text-gray-700">화면에 맞추기 (여백 발생)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ) : modalConfig.action === 'edit_page' ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-gray-600 mb-2">{modalConfig.message}</p>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <span className="block text-sm font-semibold text-gray-700 mb-2">이미지 표시 방식</span>
                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="editImageFit"
                                        value="cover"
                                        checked={editState?.newFit === 'cover'}
                                        onChange={() => setEditState(prev => prev ? ({ ...prev, newFit: 'cover' }) : null)}
                                        className="w-4 h-4 text-brand-purple focus:ring-brand-purple"
                                    />
                                    <span className="text-sm text-gray-700">꽉 채우기</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="editImageFit"
                                        value="contain"
                                        checked={editState?.newFit === 'contain'}
                                        onChange={() => setEditState(prev => prev ? ({ ...prev, newFit: 'contain' }) : null)}
                                        className="w-4 h-4 text-brand-purple focus:ring-brand-purple"
                                    />
                                    <span className="text-sm text-gray-700">화면에 맞추기</span>
                                </label>
                            </div>

                            <div className="border-t pt-4">
                                <button
                                    onClick={handleReplaceImage}
                                    className="w-full py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    이미지 교체하기
                                </button>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    이미지 교체 시 즉시 파일 선택창이 열립니다.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="whitespace-pre-line">{modalConfig.message}</div>
                )}
            </Modal>
        </div >
    )
}

