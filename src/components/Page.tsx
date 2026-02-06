
import React from 'react'
import { Database } from '../types/supabase'
import { useEditorStore, TextLayer } from '../store/editorStore'
import TextLayerItem from './TextLayerItem'
import LazyImage from './LazyImage'

type PageData = Database['public']['Tables']['pages']['Row'] & { image_fit?: 'cover' | 'contain' }

interface PageProps {
    frontPage?: PageData
    backPage?: PageData
    index: number // Leaf Index
    isFlipped: boolean
    zIndex: number
    isRtl: boolean
    showPageNumbers: boolean
    onPageClick: () => void
    onEditPage: (page: PageData) => void
    onUpdateLayer: (pageId: string, layer: TextLayer) => void
    isImageEditMode: boolean
    shouldLoad: boolean
}

export default function Page({
    frontPage,
    backPage,
    index,
    isFlipped,
    zIndex,
    isRtl,
    showPageNumbers,
    onPageClick,
    onEditPage,
    onUpdateLayer,
    isImageEditMode,
    shouldLoad
}: PageProps) {
    const { selectedLayerId, setSelectedLayer, isEditingText } = useEditorStore()

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent bubbling
        // If clicking background and NOT editing text, deselect
        if (!isEditingText) {
            setSelectedLayer(null)
        }
        onPageClick()
    }

    const handleEdit = (e: React.MouseEvent, page: PageData) => {
        e.stopPropagation()
        onEditPage(page)
    }

    const getTextLayers = (page?: PageData): TextLayer[] => {
        if (!page?.text_layers) return []
        return Array.isArray(page.text_layers) ? page.text_layers as unknown as TextLayer[] : []
    }

    return (
        <div
            className={`
        absolute top-0 w-1/2 h-full cursor-pointer group
        transition-luxury preserve-3d
        ${isRtl ? 'left-0 origin-right' : 'left-1/2 origin-left'}
        ${isFlipped ? (isRtl ? 'rotate-y-180' : '-rotate-y-180') : ''}
      `}
            style={{ zIndex }}
            onClick={handleClick}
        >
            {/* Front Face: Displays `frontPage` data */}
            <div
                className="absolute inset-0 w-full h-full bg-page-bg backface-hidden flex items-center justify-center overflow-hidden border-r border-gray-200"
                style={{ transform: 'translateZ(1px)' }}
            >
                {/* Image or Placeholder */}
                {frontPage?.media_url ? (
                    <LazyImage
                        src={frontPage.media_url}
                        alt={`Page ${frontPage.page_number}`}
                        shouldLoad={shouldLoad}
                        fit={frontPage.image_fit}
                    />
                ) : (
                    <div className="text-gray-400 select-none">
                        Front (Page {frontPage?.page_number || (index * 2 + 1)})
                    </div>
                )}

                {/* Text Layers */}
                {frontPage?.id && getTextLayers(frontPage).map(layer => (
                    <TextLayerItem
                        key={layer.id}
                        layer={layer}
                        isSelected={selectedLayerId === layer.id}
                        isEditing={selectedLayerId === layer.id && isEditingText}
                        scale={1}
                        onSelect={() => setSelectedLayer(layer.id)}
                        onUpdate={(updates) => onUpdateLayer(frontPage.id, { ...layer, ...updates })}
                    />
                ))}

                {/* Edit Overlay */}
                {frontPage?.id && (
                    <button
                        onClick={(e) => handleEdit(e, frontPage)}
                        className={`absolute top-4 right-4 p-3 bg-white shadow-md rounded-full text-gray-600 hover:text-brand-purple hover:bg-gray-50 transition-all duration-200 z-30
                            ${isImageEditMode ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
                        `}
                        title="이미지 편집"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    </button>
                )}

                {/* Page Number Overlay */}
                {showPageNumbers && (
                    <div className="absolute bottom-4 right-6 pointer-events-none font-serif text-gray-500 font-medium">
                        {frontPage?.page_number || (index * 2 + 1)}
                    </div>
                )}
            </div>

            {/* Back Face: Displays `backPage` data */}
            <div
                className="absolute inset-0 w-full h-full bg-white flex items-center justify-center overflow-hidden"
                style={{ transform: 'rotateY(180deg) translateZ(1px)', zIndex: 10 }}
            >
                {/* Image or Placeholder */}
                {backPage?.media_url ? (
                    <LazyImage
                        src={backPage.media_url}
                        alt={`Page ${backPage.page_number}`}
                        shouldLoad={shouldLoad}
                        fit={backPage.image_fit}
                    />
                ) : (
                    <div className="text-gray-400 select-none">
                        Back (Page {backPage?.page_number || (index * 2 + 2)})
                    </div>
                )}

                {/* Text Layers */}
                {backPage?.id && getTextLayers(backPage).map(layer => (
                    <TextLayerItem
                        key={layer.id}
                        layer={layer}
                        isSelected={selectedLayerId === layer.id}
                        isEditing={selectedLayerId === layer.id && isEditingText}
                        scale={1}
                        onSelect={() => setSelectedLayer(layer.id)}
                        onUpdate={(updates) => onUpdateLayer(backPage.id, { ...layer, ...updates })}
                    />
                ))}

                {/* Edit Overlay */}
                {backPage?.id && (
                    <button
                        onClick={(e) => handleEdit(e, backPage)}
                        className={`absolute top-4 left-4 p-3 bg-white shadow-md rounded-full text-gray-600 hover:text-brand-purple hover:bg-gray-50 transition-all duration-200 z-30
                            ${isImageEditMode ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
                        `}
                        title="이미지 편집"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    </button>
                )}

                {/* Page Number Overlay */}
                {showPageNumbers && (
                    <div className="absolute bottom-4 left-6 pointer-events-none font-serif text-gray-500 font-medium">
                        {backPage?.page_number || (index * 2 + 2)}
                    </div>
                )}

                <div className={`
          absolute top-0 w-[5px] h-full bg-gradient-to-r from-gray-200 to-white
          ${isRtl ? 'left-0 origin-left -rotate-y-90' : 'right-0 origin-right rotate-y-90'}
        `} />
            </div>
        </div>
    )
}
