
import { useRef, useEffect, useCallback } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { useBookStore } from '../store/bookStore'
import { useUIStore } from '../store/uiStore'
// import { useAudio } from '../hooks/useAudio' // Hook used to live here
import Page from './Page'
import { TextLayer } from '../store/editorStore' // Removed useEditorStore
import { Database } from '../types/supabase'

type PageData = Database['public']['Tables']['pages']['Row'] & { image_fit?: 'cover' | 'contain' }

interface BookProps {
    onEditPage?: (page: PageData) => void
    onUpdateLayer?: (pageId: string, layer: TextLayer) => void
    isImageEditMode: boolean
    onFlipPage?: () => void
}

export default function Book({ onEditPage, onUpdateLayer, isImageEditMode, onFlipPage }: BookProps) {
    const {
        pages,
        currentLeaf,
        flipTo,
        isRtl,
        coverUrl // Added coverUrl from store
    } = useBookStore()

    const { scale, showPageNumbers } = useUIStore()

    const bookRef = useRef<any>(null)

    // Sync Store -> UI
    useEffect(() => {
        if (bookRef.current) {
            const pageFlip = bookRef.current.pageFlip()
            if (!pageFlip) return

            // Calculate target page index from leaf
            // Leaf 0 -> Page 0 (Cover)
            // Leaf 1 -> Page 2 (Content starts at 2 if we have Cover + Inside)

            let targetPageIndex = 0
            if (currentLeaf === 0) {
                targetPageIndex = 0
            } else {
                targetPageIndex = currentLeaf === 0 ? 0 : (currentLeaf * 2 - 1)
            }

            try {
                // Determine if we need to flip
                pageFlip.flip(targetPageIndex)
            } catch (e) {
                console.warn("Flip error:", e)
            }
        }
    }, [currentLeaf, pages.length, coverUrl])

    const onFlip = useCallback((e: any) => {
        if (onFlipPage) onFlipPage()
        // e.data is simply the page number (index)
        // Sync UI -> Store
        const newLeaf = Math.ceil(e.data / 2)

        // Only update if different to avoid loop
        if (newLeaf !== currentLeaf) {
            flipTo(newLeaf)
        }
    }, [onFlipPage, currentLeaf, flipTo])


    const PAGE_WIDTH = 650
    const PAGE_HEIGHT = 850

    // Centering Logic
    const isCover = currentLeaf === 0
    // If Cover exists, it's on the Right. Shift Left by 25% of spread (50% of page).
    const centerTransform = isCover ? 'translateX(-25%)' : 'translateX(0)'

    return (
        <div
            className="relative flex items-center justify-center h-full w-full overflow-hidden"
            style={{
                transform: `scale(${scale}) ${centerTransform}`,
                transition: 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'
            }}
        >


            {/* 
                @ts-ignore: HTMLFlipBook types might be missing or strict 
             */}
            <HTMLFlipBook
                width={PAGE_WIDTH}
                height={PAGE_HEIGHT}
                size="fixed"
                minWidth={300}
                maxWidth={1000}
                minHeight={400}
                maxHeight={1200}
                maxShadowOpacity={0.2}
                showCover={true}
                mobileScrollSupport={true}
                onFlip={onFlip}
                ref={bookRef}
                className="shadow-2xl"
                style={{ margin: '0 auto' }}
                startPage={currentLeaf === 0 ? 0 : (currentLeaf * 2 - 1)}
                drawShadow={true}
                flippingTime={800}
                usePortrait={false}
                startZIndex={10}
                autoSize={true}
                clickEventForward={true}
                useMouseEvents={true}
                swipeDistance={30}
                showPageCorners={true}
                disableFlipByClick={false}
            >
                {(() => {
                    const elements = []

                    // 1. Cover Logic
                    if (coverUrl) {
                        // Front Cover
                        elements.push(
                            <div
                                key="book-cover-front"
                                data-density="soft" // Set to soft for realistic paper feel
                                className="relative bg-page-bg overflow-hidden shadow-2xl rounded-r-sm z-50 cursor-pointer"
                            // onClick handler removed to prevent double-flip/skip
                            >
                                <img
                                    src={coverUrl}
                                    alt="Book Cover"
                                    className="w-full h-full object-cover"
                                />
                                {/* Overlay/Title could go here */}
                            </div>
                        )

                        // Inside Cover (Blank/White)
                        elements.push(
                            <div
                                key="book-cover-inside"
                                data-density="soft"
                                className="bg-white w-full h-full shadow-inner border-l border-gray-200/50"
                            ></div>
                        )
                    }

                    // 2. Content Pages
                    const contentElements = pages.map((page, index) => (
                        <Page
                            key={page.id}
                            page={page}
                            // Offset index if cover exists (Cover=0, Inside=1, Page1=2)
                            index={index + (coverUrl ? 2 : 0)}
                            isRtl={isRtl}
                            isFlipped={false}
                            zIndex={0}
                            showPageNumbers={showPageNumbers}
                            onPageClick={() => { }}
                            onEditPage={onEditPage || (() => { })}
                            onUpdateLayer={onUpdateLayer || (() => { })}
                            isImageEditMode={isImageEditMode}
                            shouldLoad={Math.abs((currentLeaf * 2) - (index + (coverUrl ? 2 : 0))) < 4}
                        />
                    ))
                    elements.push(...contentElements)

                    // 3. Padding Logic
                    // Total pages must be even
                    if (elements.length % 2 !== 0) {
                        elements.push(
                            <div
                                key="padding-page-end"
                                data-density="soft"
                                className="bg-page-bg w-full h-full shadow-inner border-l border-gray-200/50"
                            ></div>
                        )
                    }

                    return elements
                })()}
            </HTMLFlipBook>
        </div>
    )
}
