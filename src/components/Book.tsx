import { useEffect, useMemo } from 'react'
import { useBookStore } from '../store/bookStore'
import { useUIStore } from '../store/uiStore'
import Page from './Page'
import { StorybookPage } from './StorybookPage'

interface BookProps {
    onUpdateLayers?: (pageId: string, fabricJson: any) => void
    onPageClick?: (pageId: string) => void
    command?: { type: string; payload?: any; timestamp: number }
    isLocked?: boolean
    onFlipPage?: () => void
    typingSpeed?: number
    isTypewriterEnabled?: boolean
}

// Helper to normalize content into a single array
type BookPageData =
    | { type: 'cover-front'; id: string }
    | { type: 'cover-inside'; id: string }
    | { type: 'content'; data: any; index: number; id: string }
    | { type: 'storybook-image'; data: any; index: number; id: string }
    | { type: 'storybook-text'; data: any; index: number; id: string }
    | { type: 'back-cover'; id: string }
    | { type: 'padding'; id: string }

export default function Book({ onUpdateLayers, onPageClick, command, isLocked, onFlipPage, typingSpeed = 50, isTypewriterEnabled = true }: BookProps) {
    const {
        pages,
        currentLeaf,
        flipTo,
        isRtl,
        coverUrl,
        bookType,
        title,
        createdAt // Destructure createdAt
    } = useBookStore()

    const { scale, showPageNumbers } = useUIStore()

    // --- Data Normalization ---
    const allPages = useMemo(() => {
        const elements: BookPageData[] = []

        // 1. Front Cover (Always present)
        elements.push({ type: 'cover-front', id: 'cover-front' })

        // 2. Inside Front Cover (Always present)
        elements.push({ type: 'cover-inside', id: 'cover-front-inside' })

        // Special handling for Storybook: Inject Padding to ensure Image=Left(Even), Text=Right(Odd)
        // Default sequence: Front(0, Single), Inside(1, Left) -> Next is 2 (Right).
        // We want Image on Left. Left is Even.
        // So Slot 2 (Right) must be Padding/Spacer.
        // Slot 3 (Left) = Image 1. Slot 4 (Right) = Text 1.
        if (bookType === 'storybook') {
            elements.push({ type: 'padding', id: 'padding-start' } as any)
        }

        // 3. Content Pages
        pages.forEach((p, i) => {
            if (bookType === 'storybook') {
                // Split into two pages: Image (Left) and Text (Right)
                elements.push({ type: 'storybook-image', data: p, index: i, id: `${p.id}-img` })
                elements.push({ type: 'storybook-text', data: p, index: i, id: `${p.id}-txt` })
            } else {
                elements.push({ type: 'content', data: p, index: i, id: p.id })
            }
        })

        if (elements.length % 2 !== 0) {
            elements.push({ type: 'padding', id: 'padding-fill' } as any)
        }

        elements.push({ type: 'cover-inside', id: 'cover-back-inside' })
        elements.push({ type: 'back-cover', id: 'back-cover' })

        if (elements.length % 2 !== 0) {
            elements.splice(elements.length - 2, 0, { type: 'padding', id: 'padding-final' } as any)
        }

        return elements
    }, [pages, coverUrl, bookType, isTypewriterEnabled, typingSpeed])

    // Calculate valid max leaf
    const maxLeaf = Math.ceil(allPages.length / 2)

    // Navigation Handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

            if (e.key === 'ArrowLeft') {
                flipTo(Math.max(0, currentLeaf - 1))
                onFlipPage?.()
            } else if (e.key === 'ArrowRight') {
                flipTo(Math.min(maxLeaf, currentLeaf + 1))
                onFlipPage?.()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentLeaf, flipTo, maxLeaf])

    // Rendering Helpers
    const PAGE_WIDTH = 650
    const PAGE_HEIGHT = 850

    const leftPageIndex = currentLeaf * 2 - 1
    const rightPageIndex = currentLeaf * 2

    const leftPageData = leftPageIndex >= 0 ? allPages[leftPageIndex] : null
    const rightPageData = rightPageIndex < allPages.length ? allPages[rightPageIndex] : null

    const renderPageContent = (pageData: BookPageData | null) => {
        if (!pageData) return <div className="w-full h-full bg-transparent" />
        // @ts-ignore
        // @ts-ignore
        if (pageData.type === 'padding') {
            return (
                <div className="w-full h-full bg-[#fdfbf7] relative shadow-inner overflow-hidden">
                    <div className="absolute inset-0 opacity-30 bg-paper-pattern pointer-events-none" />
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                        <span className="font-serif italic text-4xl text-gray-300 select-none">Notes</span>
                    </div>
                </div>
            )
        }

        // Leather Cover Style Helper
        const LeatherCover = ({ title, isBack = false }: { title?: string, isBack?: boolean }) => (
            <div className="w-full h-full relative bg-[#5D4037] overflow-hidden shadow-2xl rounded-r-md select-none flex flex-col items-center justify-center text-center p-8">
                {/* Leather Texture Effect */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")` }}
                />

                {/* Stitching Line */}
                <div className="absolute inset-4 border-2 border-dashed border-[#8D6E63] rounded-sm pointer-events-none opacity-50" />

                {/* Spine Highlight */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/20 to-transparent" />

                <div className="relative z-10 flex flex-col items-center gap-6 w-full px-4">
                    {/* Title / Text */}
                    {title && (
                        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-[#EFEBE9] drop-shadow-md tracking-wider border-y-2 border-[#8D6E63] py-4 px-8 max-w-full break-all leading-tight text-center">
                            {title}
                        </h1>
                    )}

                    {isBack && (
                        <div className="text-xl font-serif text-[#A1887F] tracking-widest mt-4">
                            THE END
                        </div>
                    )}
                </div>

                {/* Gloss / Lighting */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-white/5 to-white/10 pointer-events-none" />
            </div>
        )

        if (pageData.type === 'cover-front') {
            if (coverUrl) {
                return (
                    <div className="w-full h-full relative bg-[#fdfbf7] overflow-hidden shadow-2xl rounded-r-md select-none group">
                        <img src={coverUrl} className="w-full h-full object-cover select-none pointer-events-none" draggable={false} alt="Cover" />
                        <div className="absolute inset-0 bg-gradient-to-l from-black/0 to-black/10 pointer-events-none" />
                    </div>
                )
            } else {
                return <LeatherCover title={title} />
            }
        }

        if (pageData.type === 'cover-inside') {
            const isFrontInside = pageData.id === 'cover-front-inside'
            const isBackInside = pageData.id === 'cover-back-inside'

            return (
                <div className="w-full h-full bg-[#fdfbf7] shadow-inner border-l border-gray-200/50 select-none relative overflow-hidden">
                    {/* Paper Texture */}
                    <div className="absolute inset-0 opacity-50 bg-paper-pattern pointer-events-none" />

                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-12 text-center">
                        {isFrontInside && (
                            <>
                                <div className="mb-8 p-4 border-b-2 border-gray-800/10 w-24" />
                                <h2 className="text-3xl font-serif font-bold text-gray-800 mb-4 tracking-wide break-all max-w-full px-4">{title}</h2>
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-12">
                                    {createdAt ? new Date(createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
                                </p>

                                <div className="mt-auto opacity-40">
                                    <p className="text-xs text-gray-400 font-serif italic">Created with</p>
                                    <p className="text-sm font-bold text-gray-600 tracking-wider mt-1">FLIPBOOK PRO</p>
                                </div>
                            </>
                        )}

                        {isBackInside && (
                            <div className="flex flex-col items-center opacity-60">
                                <span className="text-lg font-serif italic text-gray-400 mb-2">The End</span>
                                <div className="w-16 h-px bg-gray-300" />
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        if (pageData.type === 'back-cover') {
            return <LeatherCover isBack={true} />
        }

        if (pageData.type === 'content') {
            return (
                <Page
                    page={pageData.data}
                    index={pageData.index}
                    isRtl={isRtl}
                    showPageNumbers={showPageNumbers}
                    onPageClick={() => onPageClick?.(pageData.data.id)}
                    onUpdateLayers={onUpdateLayers || (() => { })}
                    command={command}
                    isLocked={isLocked}
                    shouldLoad={true}
                    className="bg-[#fdfbf7] select-none"
                />
            )
        }

        if (pageData.type === 'storybook-image') {
            return (
                <div className="w-full h-full bg-[#fdfbf7] overflow-hidden shadow-inner border-r border-gray-200/20 select-none">
                    <StorybookPage
                        page={pageData.data}
                        isEditing={!isLocked}
                        mode="image"
                        typingSpeed={typingSpeed}
                        isTypewriterEnabled={isTypewriterEnabled}
                        onPageUpdate={onUpdateLayers}
                    />
                    {showPageNumbers && (
                        <div className="absolute bottom-4 w-full text-center text-gray-400 text-xs font-medium bg-[#fdfbf7]/80 backdrop-blur-sm py-1 select-none">
                            {pageData.index * 2 + 1}
                        </div>
                    )}
                </div>
            )
        }

        if (pageData.type === 'storybook-text') {
            return (
                <div className="w-full h-full bg-white overflow-hidden shadow-inner border-l border-gray-200/10 select-none">
                    <StorybookPage
                        page={pageData.data}
                        isEditing={!isLocked}
                        mode="text"
                        typingSpeed={typingSpeed}
                        isTypewriterEnabled={isTypewriterEnabled}
                        onPageUpdate={onUpdateLayers}
                    />
                    {showPageNumbers && (
                        <div className="absolute bottom-4 w-full text-center text-gray-400 text-xs font-medium bg-white/80 backdrop-blur-sm py-1 select-none">
                            {pageData.index * 2 + 2}
                        </div>
                    )}
                </div>
            )
        }

    }

    return (
        <div
            className="relative flex items-center justify-center w-full h-full select-none group"
            style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.3s'
            }}
        >
            {/* Navigation Controls - Visible only on hover */}
            <button
                onClick={() => {
                    flipTo(Math.max(0, currentLeaf - 1))
                    onFlipPage?.()
                }}
                disabled={currentLeaf === 0}
                className={`absolute left-4 top-1/2 -translate-y-1/2 z-[200] p-3 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/90 shadow-lg border border-gray-100 text-gray-700 hover:text-brand-orange hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 duration-300 outline-none
                    ${currentLeaf === 0 ? 'pointer-events-none hidden' : ''}
                `}
                title="Previous Page"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>

            <button
                onClick={() => {
                    flipTo(Math.min(maxLeaf, currentLeaf + 1))
                    onFlipPage?.()
                }}
                disabled={currentLeaf >= maxLeaf}
                className={`absolute right-4 top-1/2 -translate-y-1/2 z-[200] p-3 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/90 shadow-lg border border-gray-100 text-gray-700 hover:text-brand-orange hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 duration-300 outline-none
                    ${currentLeaf >= maxLeaf ? 'pointer-events-none hidden' : ''}
                `}
                title="Next Page"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>

            {/* Book Spread - Adaptive Layout */}
            <div
                className={`relative flex items-center shadow-2xl rounded-sm overflow-hidden bg-[#fdfbf7] transition-all duration-300
                    ${(currentLeaf === 0 || currentLeaf === maxLeaf) ? 'justify-center' : 'justify-center'}
                `}
                style={{
                    width: (currentLeaf === 0 || currentLeaf === maxLeaf) ? PAGE_WIDTH : PAGE_WIDTH * 2,
                    height: PAGE_HEIGHT
                }}
            >
                {/* Single Page View (Front/Back Cover) */}
                {(currentLeaf === 0 || currentLeaf === maxLeaf) ? (
                    <div className="w-full h-full relative shadow-md">
                        {currentLeaf === 0
                            ? renderPageContent(allPages[0]) // Front Cover
                            : renderPageContent(allPages[leftPageIndex]) // Back Cover (Left Side of last leaf)
                        }
                    </div>
                ) : (
                    /* Double Page View (Spreads) */
                    <>
                        {/* Left Page */}
                        <div className="w-1/2 h-full border-r border-gray-200/50 relative">
                            {renderPageContent(leftPageData)}
                        </div>

                        {/* Right Page */}
                        <div className="w-1/2 h-full relative">
                            {renderPageContent(rightPageData)}
                        </div>

                        {/* Center Gradient for Binding Effect */}
                        <div className="absolute inset-y-0 left-1/2 w-12 -ml-6 bg-gradient-to-r from-gray-400/5 via-black/5 to-gray-400/5 pointer-events-none mix-blend-multiply" />
                    </>
                )}
            </div>
        </div>
    )
}
