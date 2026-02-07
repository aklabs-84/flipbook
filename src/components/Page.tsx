
import React, { forwardRef } from 'react'
import { Database } from '../types/supabase'
import { useEditorStore, TextLayer } from '../store/editorStore'
import TextLayerItem from './TextLayerItem'
import LazyImage from './LazyImage'

type PageData = Database['public']['Tables']['pages']['Row'] & { image_fit?: 'cover' | 'contain' }

interface PageProps {
    page: PageData // Single page data
    index: number // Global page index
    showPageNumbers: boolean
    onPageClick: () => void
    onEditPage: (page: PageData) => void
    onUpdateLayer: (pageId: string, layer: TextLayer) => void
    isImageEditMode: boolean
    shouldLoad?: boolean
    // forwardRef props
    style?: React.CSSProperties
    className?: string
    isRtl?: boolean
    isFlipped?: boolean
    zIndex?: number // managed by library usually, but good to have
}

const Page = forwardRef<HTMLDivElement, PageProps>(({
    page,
    index,
    showPageNumbers,
    onPageClick,
    onEditPage,
    onUpdateLayer,
    isImageEditMode,
    shouldLoad = true,
    style,
    className
}, ref) => {
    const { selectedLayerId, setSelectedLayer, isEditingText } = useEditorStore()

    const handleClick = () => {
        if (!isEditingText) {
            setSelectedLayer(null)
            onPageClick() // Propagate to parent if needed
        }
    }

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        onEditPage(page)
    }

    const getTextLayers = (p?: PageData): TextLayer[] => {
        if (!p?.text_layers) return []
        return Array.isArray(p.text_layers) ? p.text_layers as unknown as TextLayer[] : []
    }

    const isCover = index === 0

    return (
        <div
            ref={ref}
            data-density="soft"
            className={`
                relative bg-page-bg overflow-hidden shadow-inner border-r border-gray-200/50
                ${className || ''} 
                ${isCover ? 'rounded-r-sm' : ''} 
            `}
            style={{ ...style, backgroundColor: 'var(--page-bg)' }}
            onClick={handleClick}
        >
            {/* 
                Backface Protection Layer 
                Ensures that when the page flips, the "back" of this specific DOM element 
                isn't just a transparent window or a reversed image of the front.
             */}
            <div className="absolute inset-0 bg-page-bg -z-10" />

            {/* Content Wrapper */}
            <div className="w-full h-full relative z-10">
                {/* Image or Placeholder */}
                {page?.media_url ? (
                    <LazyImage
                        src={page.media_url}
                        alt={`Page ${page.page_number}`}
                        shouldLoad={shouldLoad}
                        fit={page.image_fit}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 select-none bg-white">
                        {index === 0 ? 'Cover' : `Page ${page.page_number}`}
                    </div>
                )}

                {/* Text Layers */}
                {page?.id && getTextLayers(page).map(layer => (
                    <TextLayerItem
                        key={layer.id}
                        layer={layer}
                        isSelected={selectedLayerId === layer.id}
                        isEditing={selectedLayerId === layer.id && isEditingText}
                        scale={1} // The library might scale the container, so relative scale is 1
                        onSelect={() => setSelectedLayer(layer.id)}
                        onUpdate={(updates) => onUpdateLayer(page.id, { ...layer, ...updates })}
                    />
                ))}

                {/* Edit Overlay Button */}
                {page?.id && (
                    <button
                        onClick={handleEdit}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/95 backdrop-blur shadow-md rounded-full text-gray-700 hover:text-brand-purple hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200 z-30 border-2 border-transparent hover:border-brand-purple/20
                            ${isImageEditMode ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
                        `}
                        title="이미지 편집"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    </button>
                )}

                {/* Page Number */}
                {showPageNumbers && (
                    <div className="absolute bottom-4 right-6 pointer-events-none font-serif text-gray-400/80 font-medium text-xs">
                        {page.page_number}
                    </div>
                )}

                {/* Subtle Spine Gradient */}
                <div
                    className={`absolute top-0 bottom-0 pointer-events-none w-12 z-20 mix-blend-multiply opacity-[0.03]
                        ${index % 2 === 0
                            ? 'left-0 bg-gradient-to-r from-black to-transparent'
                            : 'right-0 bg-gradient-to-l from-black to-transparent'
                        }
                    `}
                ></div>
            </div>
        </div>
    )
})

Page.displayName = 'Page'

export default Page
