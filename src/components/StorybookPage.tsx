import React, { useState, useEffect, useRef } from 'react'
import { Upload, Play, Loader2 } from 'lucide-react'
import { useBookStore } from '../store/bookStore'
// @ts-ignore
import { Database } from '../types/supabase'

type Page = Database['public']['Tables']['pages']['Row']

// isActive prop removed until needed
interface StorybookPageProps {
    page: Page
    isEditing: boolean
    mode?: 'image' | 'text' | 'both'
    typingSpeed?: number
    isTypewriterEnabled?: boolean
    onPageUpdate?: (pageId: string, data: any) => void
}

export const StorybookPage: React.FC<StorybookPageProps> = ({ page, isEditing, mode = 'both', typingSpeed = 50, isTypewriterEnabled = true, onPageUpdate }) => {
    const { updatePage, savePageChanges } = useBookStore()
    const [text, setText] = useState('')
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain')
    const [fontSize, setFontSize] = useState<number>(22) // Default font size

    // Typewriter state
    const [displayedText, setDisplayedText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [isFocused, setIsFocused] = useState(false) // New: Track focus for editing
    const [triggerPlay, setTriggerPlay] = useState(0)
    const [isUploading, setIsUploading] = useState(false) // New: Upload loading state

    // Refs for effect access
    const textRef = useRef(text)
    const isEditingRef = useRef(isEditing)
    const isTypewriterEnabledRef = useRef(isTypewriterEnabled)

    // Update refs
    useEffect(() => {
        textRef.current = text
        isEditingRef.current = isEditing
        isTypewriterEnabledRef.current = isTypewriterEnabled
    }, [text, isEditing, isTypewriterEnabled])

    // Load initial data
    useEffect(() => {
        // Parse text from text_layers if it exists, otherwise empty
        // We'll use a simple JSON structure for storybook: { content: "...", imageFit: "...", fontSize: 22 }
        if (page.text_layers) {
            try {
                const data = typeof page.text_layers === 'string'
                    ? JSON.parse(page.text_layers as string)
                    : page.text_layers
                setText(data.content || '')
                setImageFit(data.imageFit || 'contain')
                if (data.fontSize) setFontSize(data.fontSize)
            } catch (e) {
                console.error('Failed to parse page text', e)
            }
        }
        setImageUrl(page.media_url)
    }, [page])

    // Effect: Handle Text Changes & Mode Switching
    useEffect(() => {
        // If Viewer Mode (!isEditing): Auto-play on mount/text change
        // If Editor Mode (isEditing): Show full text static by default

        if (mode === 'image') return

        if (!isEditing) {
            // Viewer Mode
            if (isTypewriterEnabled) {
                // Auto Play if Enabled
                setTriggerPlay(prev => prev + 1)
            } else {
                // Static if Disabled
                setDisplayedText(text)
                setIsTyping(false)
            }
        } else {
            // Editor Mode: Static Full Text
            setDisplayedText(text)
            setIsTyping(false)
        }
    }, [text, mode, page.id, isEditing, isTypewriterEnabled])

    // Effect: Run Typewriter Animation when triggerPlay changes
    useEffect(() => {
        // Use refs to avoid re-running on text/mode/editing changes unless triggerPlay changes
        const currentIsEditing = isEditingRef.current
        const currentIsTypewriterEnabled = isTypewriterEnabledRef.current
        const currentText = textRef.current || ''

        if (!currentIsEditing && mode === 'image') return
        if (triggerPlay === 0) return // Skip initial render if 0

        // Double check enable state just in case
        if (!currentIsEditing && !currentIsTypewriterEnabled) {
            setDisplayedText(currentText)
            setIsTyping(false)
            return
        }

        setDisplayedText('')
        setIsTyping(true)

        let currentIndex = 0
        const fullText = currentText

        if (!fullText) {
            setDisplayedText('')
            setIsTyping(false)
            return
        }

        const intervalId = setInterval(() => {
            if (currentIndex < fullText.length) {
                currentIndex++
                setDisplayedText(fullText.slice(0, currentIndex))
            } else {
                setIsTyping(false)
                clearInterval(intervalId)
            }
        }, typingSpeed)

        return () => clearInterval(intervalId)
    }, [triggerPlay, typingSpeed, mode]) // Removed text, isEditing, isTypewriterEnabled from deps

    const handlePlayClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setTriggerPlay(prev => prev + 1)
    }

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value
        setText(newText)
        setTriggerPlay(0) // Reset play trigger when typing manually

        // Auto-save logic could go here (debounce)
        // For now, we update store state immediately
        const newLayerData = { content: newText, type: 'text', imageFit, fontSize }

        if (onPageUpdate) {
            onPageUpdate(page.id, newLayerData)
        } else {
            updatePage(page.id, { text_layers: newLayerData })
        }
    }

    const handleFontSizeChange = (delta: number) => {
        const newSize = Math.max(12, Math.min(60, fontSize + delta))
        setFontSize(newSize)
        const newLayerData = { content: text, type: 'text', imageFit, fontSize: newSize }

        if (onPageUpdate) {
            onPageUpdate(page.id, newLayerData)
        } else {
            updatePage(page.id, { text_layers: newLayerData })
            savePageChanges(page.id, { text_layers: newLayerData })
        }
    }

    const handleBlur = () => {
        setIsFocused(false) // Exit focus mode
        // Save on blur
        const newLayerData = { content: text, type: 'text', imageFit, fontSize }

        if (onPageUpdate) {
            onPageUpdate(page.id, newLayerData)
        } else {
            savePageChanges(page.id, { text_layers: newLayerData })
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true) // Start loading
        try {
            const { uploadMedia } = await import('../services/storageService')
            // Path: userId/bookId/pageId_timestamp
            const { data: { user } } = await import('../lib/supabase').then(m => m.supabase.auth.getUser())
            if (!user) throw new Error("User not found")

            const folderPath = `${user.id}/${page.book_id}`
            const publicUrl = await uploadMedia(file, 'uploads', folderPath)

            setImageUrl(publicUrl)

            // Update Page
            updatePage(page.id, { media_url: publicUrl, media_type: 'image' })
            savePageChanges(page.id, { media_url: publicUrl, media_type: 'image' })

        } catch (error) {
            console.error('Error uploading image:', error)
            alert('이미지 업로드 실패')
        } finally {
            setIsUploading(false) // End loading
        }
    }

    return (
        <div className="w-full h-full flex bg-white shadow-sm overflow-hidden">
            {/* Image Area - Show if mode is image or both */}
            {(mode === 'image' || mode === 'both') && (
                <div className={`${mode === 'both' ? 'w-1/2 border-r' : 'w-full'} h-full border-gray-100 relative bg-gray-50 flex items-center justify-center group`}>
                    {isUploading ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-brand-purple animate-pulse">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs font-bold">이미지 처리 중...</span>
                        </div>
                    ) : imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Page Illustration"
                            className={`w-full h-full ${imageFit === 'cover' ? 'object-cover' : 'object-contain'}`}
                        />
                    ) : (
                        <div className="text-center text-gray-400">
                            <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <span className="text-sm">이미지 업로드</span>
                        </div>
                    )}

                    {!isUploading && isEditing && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                            <div className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 px-4 py-2 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                                {imageUrl ? '이미지 변경' : '이미지 선택'}
                            </div>
                        </label>
                    )}
                </div>
            )}

            {/* Text Area - Show if mode is text or both */}
            {(mode === 'text' || mode === 'both') && (
                <div
                    className={`${mode === 'both' ? 'w-1/2' : 'w-full'} h-full px-12 py-12 flex flex-col justify-center relative bg-white group cursor-text`}
                    onClick={() => {
                        if (isEditing && !isFocused) setIsFocused(true)
                    }}
                >
                    {/* Toolbar - Visible on Hover when Editing */}
                    {isEditing && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-gray-100 rounded-lg p-1 z-20">
                            {/* Play Button for Manual Typewriter Effect */}
                            <button
                                onClick={handlePlayClick}
                                className={`p-2 hover:bg-brand-purple/10 rounded text-gray-600 hover:text-brand-purple transition-colors ${isTyping ? 'text-brand-purple animate-pulse' : ''}`}
                                title="Play Typewriter Effect"
                            >
                                <Play className="w-4 h-4 fill-current" />
                            </button>

                            <div className="w-px h-4 bg-gray-200 my-auto mx-1" />

                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleFontSizeChange(-2)
                                }}
                                className="p-2 hover:bg-gray-100 rounded text-gray-600 font-medium text-sm"
                                title="Smaller Text"
                            >
                                A-
                            </button>
                            <div className="flex items-center px-2 text-xs text-gray-400 select-none">
                                {fontSize}px
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleFontSizeChange(2)
                                }}
                                className="p-2 hover:bg-gray-100 rounded text-gray-600 font-medium text-sm"
                                title="Larger Text"
                            >
                                A+
                            </button>
                        </div>
                    )}

                    {isEditing && isFocused ? (
                        <textarea
                            value={text}
                            onChange={handleTextChange}
                            onBlur={handleBlur}
                            autoFocus
                            placeholder="이야기를 입력하세요..."
                            className="w-full h-[80%] resize-none outline-none leading-relaxed text-gray-800 placeholder-gray-400 font-medium bg-transparent border-none focus:ring-0 text-center"
                            style={{
                                fontFamily: 'Pretendard, sans-serif',
                                fontSize: `${fontSize}px`
                            }}
                        />
                    ) : (
                        <div
                            className="prose prose-lg text-gray-800 leading-relaxed whitespace-pre-wrap text-center mx-auto min-h-[50%]"
                            style={{
                                fontFamily: 'Pretendard, sans-serif',
                                fontSize: `${fontSize}px`
                            }}
                        >
                            {displayedText}
                            {/* Cursor effect while typing */}
                            {isTyping && <span className="animate-pulse inline-block w-0.5 h-5 bg-black ml-0.5 align-middle"></span>}
                            {/* Always show placeholder if empty in edit mode */}
                            {!text && isEditing && (
                                <span className="text-gray-400 block mt-4 select-none animate-in fade-in">
                                    이곳을 클릭하여 이야기를 작성하세요...
                                </span>
                            )}
                        </div>
                    )}

                    {/* TTS Badge Removed */}
                </div>
            )}
        </div>
    )
}
