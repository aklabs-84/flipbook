import React, { useRef, useEffect } from 'react'
import { TextLayer, useEditorStore } from '../store/editorStore'

interface TextLayerItemProps {
    layer: TextLayer
    isSelected: boolean
    isEditing: boolean
    scale: number
    onSelect: (e: React.MouseEvent) => void
    onUpdate: (updates: Partial<TextLayer>) => void
}

export default function TextLayerItem({
    layer,
    isSelected,
    isEditing,
    // scale,
    onSelect,
    onUpdate
}: TextLayerItemProps) {
    const { setIsEditingText } = useEditorStore()
    const itemRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)
    const startMousePos = useRef({ x: 0, y: 0 })
    const initialLayerPos = useRef({ x: 0, y: 0 })

    // Handle Dragging
    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault() // Prevent native text selection/drag interactions
        onSelect(e)

        if (isEditing) return // Don't drag while editing text

        isDragging.current = true
        startMousePos.current = { x: e.clientX, y: e.clientY }
        initialLayerPos.current = { x: layer.x, y: layer.y }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !itemRef.current) return

        const parent = itemRef.current.parentElement
        if (!parent) return

        const parentRect = parent.getBoundingClientRect()

        // Calculate delta in percentage relative to INITIAL mouse pos
        const deltaX = ((e.clientX - startMousePos.current.x) / parentRect.width) * 100
        const deltaY = ((e.clientY - startMousePos.current.y) / parentRect.height) * 100

        onUpdate({
            x: Math.max(0, Math.min(100, initialLayerPos.current.x + deltaX)),
            y: Math.max(0, Math.min(100, initialLayerPos.current.y + deltaY))
        })
    }

    const handleMouseUp = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsEditingText(true)
    }

    // Auto-focus textarea when editing
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.select()
        }
    }, [isEditing])

    return (
        <div
            ref={itemRef}
            className={`absolute select-none group ${isSelected ? 'z-50' : 'z-30'}`}
            style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                transform: 'translate(-50%, -50%)', // Center anchor
                cursor: isEditing ? 'text' : 'move'
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onClick={(e) => e.stopPropagation()} // Prevent page flip when clicking layer
        >
            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={layer.text}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    onBlur={() => setIsEditingText(false)}
                    className="bg-transparent resize-none border-2 border-brand-purple outline-none overflow-hidden min-w-[50px] text-center"
                    style={{
                        fontSize: `${layer.fontSize}px`,
                        color: layer.color,
                        fontFamily: layer.fontFamily,
                        fontWeight: layer.fontWeight,
                        lineHeight: 1.2
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            setIsEditingText(false)
                        }
                    }}
                />
            ) : (
                <div
                    className={`whitespace-pre-wrap text-center px-4 py-2 border-2 transition-all duration-200
                        ${isSelected
                            ? 'border-brand-purple bg-white/10 shadow-[0_0_0_2px_rgba(168,85,247,0.4)] relative'
                            : 'border-transparent hover:border-gray-300 hover:bg-black/5'}
                    `}
                    style={{
                        fontSize: `${layer.fontSize}px`,
                        color: layer.color,
                        fontFamily: layer.fontFamily,
                        fontWeight: layer.fontWeight,
                        lineHeight: 1.2
                    }}
                >
                    {layer.text}

                    {/* Corner Handles (Visual Only) */}
                    {isSelected && (
                        <>
                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-brand-purple rounded-full shadow-sm"></div>
                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-brand-purple rounded-full shadow-sm"></div>
                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-brand-purple rounded-full shadow-sm"></div>
                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-brand-purple rounded-full shadow-sm"></div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
