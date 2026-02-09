import React, { forwardRef } from 'react'
import { Database } from '../types/supabase'
import FabricCanvas from './FabricCanvas'
import { useEditorStore } from '../store/editorStore'

type PageData = Database['public']['Tables']['pages']['Row']

interface PageProps {
    page: PageData
    index: number
    showPageNumbers: boolean
    onPageClick: () => void
    onUpdateLayers: (pageId: string, fabricJson: any) => void
    command?: { type: string; payload?: any; timestamp: number }
    isLocked?: boolean
    shouldLoad?: boolean
    style?: React.CSSProperties
    className?: string
    isRtl?: boolean
    width?: number
    height?: number
}

const PAGE_WIDTH = 650
const PAGE_HEIGHT = 850

const Page = forwardRef<HTMLDivElement, PageProps>(({
    page,
    index,
    showPageNumbers,
    onPageClick,
    onUpdateLayers,
    command,
    isLocked,
    style,
    className
}, ref) => {
    const { activeTool, brushColor, brushWidth, setSelectedLayer, setActiveTool } = useEditorStore()

    const handleClick = () => {
        if (activeTool === 'select') {
            setSelectedLayer(null)
        }
        onPageClick()
    }

    const isCover = index === 0

    return (
        <div
            ref={ref}
            data-density="soft"
            className={`
                relative overflow-hidden shadow-inner border-r border-gray-200/50
                ${className || ''}
                ${isCover ? 'rounded-r-sm' : ''}
            `}
            style={{
                ...style,
                backgroundColor: '#fdfbf7', // Hardcode to ensure opacity during flip
                backgroundImage: 'none', // Ensure no conflicting background
                zIndex: isLocked ? 100 : style?.zIndex,
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT
            }}
            onClick={handleClick}
        >
            {/* Fabric Canvas Layer */}
            <div
                className={`absolute inset-0 z-10 ${activeTool === 'draw' ? 'cursor-crosshair' : activeTool === 'eraser' ? 'cursor-cell' : ''}`}
            >
                <FabricCanvas
                    width={PAGE_WIDTH}
                    height={PAGE_HEIGHT}
                    activeTool={activeTool}
                    brushColor={brushColor}
                    brushWidth={brushWidth}
                    initialData={page.text_layers}
                    backgroundImage={page.media_url || undefined}
                    imageFit={page.image_fit === 'contain' ? 'contain' : 'cover'}
                    pageId={page.id}
                    command={command}
                    onUpdate={(json) => onUpdateLayers(page.id, json)}
                    onSelect={(target) => {
                        if (target) {
                            // Switch to select mode when object selected
                            if (activeTool !== 'select') {
                                setActiveTool('select')
                            }
                            setSelectedLayer((target as any).id || `obj-${Date.now()}`)
                        } else {
                            if (activeTool === 'select') {
                                setSelectedLayer(null)
                            }
                        }
                    }}
                />
            </div>

            {/* Page Number */}
            {showPageNumbers && (
                <div className="absolute bottom-4 right-6 pointer-events-none font-serif text-gray-400/80 font-medium text-xs z-20">
                    {index + 1}
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
            />
        </div>
    )
})

Page.displayName = 'Page'

export default Page
