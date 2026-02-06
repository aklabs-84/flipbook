import React, { useState } from 'react'
import { useBookStore } from '../store/bookStore'
import { useUIStore } from '../store/uiStore'
import { useSound } from '../hooks/useSound'
import Page from './Page'
import { Database } from '../types/supabase'
import { TextLayer, useEditorStore } from '../store/editorStore'

type PageData = Database['public']['Tables']['pages']['Row'] & { image_fit?: 'cover' | 'contain' }

interface BookProps {
    onEditPage?: (page: PageData) => void
    onUpdateLayer?: (pageId: string, layer: TextLayer) => void
    isImageEditMode: boolean
}

export default function Book({ onEditPage, onUpdateLayer, isImageEditMode }: BookProps) {
    const {
        pages,
        currentLeaf,
        isRtl,
        totalLeaves,
        flipTo
    } = useBookStore()

    const { selectedLayerId } = useEditorStore()

    const { scale, showPageNumbers } = useUIStore()
    const { playFlipSound } = useSound()

    // State to track which leaf is currently moving to boost its z-index
    const [movingLeafIndex, setMovingLeafIndex] = useState<number | null>(null)

    // Initial transform based on current leaf (Open, Closed Front, Closed Back)
    // Removed translateX shifts to keep the book centered and stable.
    const getBookTransform = () => {
        if (currentLeaf === 0) {
            // Cover is closed
            return isRtl
                ? 'rotateY(-20deg) rotateX(5deg)'
                : 'rotateY(20deg) rotateX(5deg)'
        } else if (currentLeaf === totalLeaves) {
            // Back cover is closed
            return isRtl
                ? 'rotateY(20deg) rotateX(5deg)'
                : 'rotateY(-20deg) rotateX(5deg)'
        } else {
            // Book is open
            return 'translateX(0) rotateY(0) rotateX(0)'
        }
    }

    const handleFlip = (targetLeaf: number) => {
        console.log('handleFlip called:', { targetLeaf, currentLeaf, totalLeaves, isRtl })
        if (targetLeaf === currentLeaf) {
            console.log('Skipping: target matches current')
            return
        }

        // Prevent flipping if editing text layer
        if (selectedLayerId) {
            console.log('Skipping: text layer selected')
            return
        }

        if (targetLeaf < 0 || targetLeaf > totalLeaves) {
            console.log('Skipping: out of bounds')
            return
        }

        playFlipSound()

        // Determine which leaf needs high z-index
        // If going forward (current -> next): Next leaf needs boost?
        // Actually, the page that IS MOVING needs boost.
        // Forward: Leaf N flips to Left. It is moving.
        // Backward: Leaf N-1 flips back to Right. It is moving.

        const isForward = targetLeaf > currentLeaf

        // Logic from original:
        // if isForward, the new page (targetLeaf) is the one flipping from right to left?
        // Let's trace:
        // Leaf 1 is Cover. Leaf 1 is index 0.
        // currentLeaf = 0. Click Cover (index 0).
        // isForward = true. targetLeaf = 1.
        // We want Page 1 (index 0) to flip.
        // Page 1 IS the moving page.
        // So 'movingLeafIndex' should be the index 0.

        let activeLeafIndex = -1
        if (isForward) {
            // Moving from Right to Left. The page at 'targetLeaf' index?
            // No, Leaves are 1-based count. Page Array is 0-based.
            // Leaf 1 = Page[0].
            // If currentLeaf=0, going to 1. We are flipping Page[0].
            activeLeafIndex = targetLeaf - 1
        } else {
            // Backward.
            // currentLeaf=1. Going to 0.
            // We are flipping Page[0] Back to Right.
            activeLeafIndex = currentLeaf - 1
        }

        setMovingLeafIndex(activeLeafIndex)
        flipTo(targetLeaf)

        // Reset z-index boost after animation
        setTimeout(() => {
            setMovingLeafIndex(null)
        }, 1200)
    }

    const handlePageClick = (leafIndex: number, _isFlipped: boolean) => {
        if (leafIndex < currentLeaf) {
            handleFlip(currentLeaf - 1)
        } else {
            handleFlip(currentLeaf + 1)
        }
    }

    // Swipe Logic
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    // Lower threshold for easier swipes on mobile
    const minSwipeDistance = 30

    const onTouchStart = (e: React.TouchEvent) => {
        // Prevent default browser swipe navigation if possible, but be careful with scroll
        // e.preventDefault() // Do NOT block vertical scroll
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if (isLeftSwipe) {
            // Swipe Left -> Go Next (unless RTL)
            if (isRtl) {
                handleFlip(currentLeaf - 1)
            } else {
                handleFlip(currentLeaf + 1)
            }
        }
        if (isRightSwipe) {
            // Swipe Right -> Go Prev (unless RTL)
            if (isRtl) {
                handleFlip(currentLeaf + 1)
            } else {
                handleFlip(currentLeaf - 1)
            }
        }
    }

    // Keyboard Navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                if (isRtl) handleFlip(currentLeaf - 1)
                else handleFlip(currentLeaf + 1)
            } else if (e.key === 'ArrowLeft') {
                if (isRtl) handleFlip(currentLeaf + 1)
                else handleFlip(currentLeaf - 1)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentLeaf, isRtl, totalLeaves]) // Dependencies for latest state

    console.log('Book Render:', { pagesLength: pages.length, totalLeaves, currentLeaf }) // DEBUG

    return (
        <div
            className="relative perspective-3000 transition-transform duration-500 ease-out"
            style={{
                width: 'var(--book-width)',
                height: 'var(--book-height)',
                transform: `scale(${scale})`,
                touchAction: 'pan-y', // Allow vertical scroll, handle horizontal in JS
                userSelect: 'none' // Prevent text selection while swiping
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div
                className="w-full h-full relative preserve-3d transition-luxury"
                style={{
                    transform: getBookTransform(),
                    boxShadow: (currentLeaf > 0 && currentLeaf < totalLeaves) ? 'var(--shadow-deep)' : 'none'
                }}
            >

                {/* 
                    Pages Array: [P1, P2, P3, P4, ...] 
                    Leaf 0: Front=P1, Back=P2
                    Leaf 1: Front=P3, Back=P4
                */}
                {Array.from({ length: totalLeaves }).map((_, index) => {
                    // Leaf Index = index
                    const leafNum = index + 1
                    const isFlipped = leafNum <= currentLeaf

                    const frontPage = pages[index * 2]
                    const backPage = pages[index * 2 + 1]

                    // Dynamic z-index
                    // Base priority:
                    // Right stack (not flipped): Lower index is Top. (0 is top) -> zIndex = 100 - index
                    // Left stack (flipped): Higher index is Top. (max is top) -> zIndex = index

                    let zIndex = 0
                    if (!isFlipped) {
                        zIndex = 100 - index
                    } else {
                        zIndex = index
                    }

                    // Boost z-index if this is the moving page
                    if (movingLeafIndex === index) {
                        zIndex += 200
                    }

                    // Critical Fix: Boost z-index of the active left page (flipped) 
                    // to match the active right page hierarchy, ensuring clicks work.
                    // Active Left Page is at index [currentLeaf - 1]
                    // Lazy Loading Logic
                    // Load Range: Current Leaf +/- 2
                    // i.e., If currentLeaf is 5, load 3,4,5,6,7
                    const LOAD_RANGE = 2
                    const shouldLoad = Math.abs(index - currentLeaf) <= LOAD_RANGE

                    if (isFlipped && index === currentLeaf - 1) {
                        zIndex += 100
                    }

                    return (
                        <Page
                            key={`leaf-${index}`}
                            frontPage={frontPage}
                            backPage={backPage}
                            index={index}
                            isFlipped={isFlipped}
                            zIndex={zIndex}
                            isRtl={isRtl}
                            showPageNumbers={showPageNumbers}
                            onPageClick={() => handlePageClick(index, isFlipped)}
                            onEditPage={onEditPage || (() => { })}
                            onUpdateLayer={onUpdateLayer || (() => { })}
                            isImageEditMode={isImageEditMode}
                            shouldLoad={shouldLoad}
                        />
                    )
                })}
            </div>

            {/* Navigation Controls (Arrows) */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
                {/* Prev Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); isRtl ? handleFlip(currentLeaf + 1) : handleFlip(currentLeaf - 1); }}
                    className={`
                        w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-gray-100
                        flex items-center justify-center text-gray-600 hover:text-brand-purple hover:scale-110 active:scale-95 transition
                        pointer-events-auto
                        ${(isRtl ? currentLeaf >= totalLeaves : currentLeaf === 0) ? 'opacity-0 cursor-default' : ''}
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>

                {/* Next Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); isRtl ? handleFlip(currentLeaf - 1) : handleFlip(currentLeaf + 1); }}
                    className={`
                        w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-gray-100
                        flex items-center justify-center text-gray-600 hover:text-brand-purple hover:scale-110 active:scale-95 transition
                        pointer-events-auto
                         ${(isRtl ? currentLeaf === 0 : currentLeaf >= totalLeaves) ? 'opacity-0 cursor-default' : ''}
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
