import { useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { EditorTool } from '../store/editorStore'

interface FabricCanvasProps {
    width: number
    height: number
    activeTool: EditorTool
    brushColor: string
    brushWidth: number
    initialData?: any
    backgroundImage?: string
    pageId: string
    command?: { type: string; payload?: any; timestamp: number }
    onUpdate?: (json: any) => void
    onSelect?: (target: any | null) => void
    imageFit?: 'cover' | 'contain'
}

export default function FabricCanvas({
    width,
    height,
    activeTool,
    brushColor,
    brushWidth,
    initialData,
    backgroundImage,
    pageId,
    command,
    onUpdate,
    onSelect,
    imageFit = 'cover' // Default to cover for backward compatibility
}: FabricCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<fabric.Canvas | null>(null)
    const isDisposing = useRef(false)
    const isRestoring = useRef(false)
    const lastCommandTimestamp = useRef<number>(0)

    // Stable refs for callbacks
    const onUpdateRef = useRef(onUpdate)
    const onSelectRef = useRef(onSelect)
    useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])
    useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

    // Safe render helper
    const safeRender = useCallback(() => {
        const canvas = fabricRef.current
        if (!canvas || isDisposing.current) return
        try {
            canvas.requestRenderAll()
        } catch {
            // Canvas might be disposed
        }
    }, [])

    // Handle modifications - notify parent
    const handleModified = useCallback(() => {
        const canvas = fabricRef.current
        if (!canvas || isDisposing.current || isRestoring.current) return
        // Export canvas to JSON (fabric v6 uses toObject for custom props)
        const json = canvas.toJSON()
        onUpdateRef.current?.(json)
    }, [])

    // Initialize canvas
    useEffect(() => {
        if (!canvasRef.current) return

        const canvas = new fabric.Canvas(canvasRef.current, {
            width,
            height,
            backgroundColor: 'transparent',
            selection: true,
            preserveObjectStacking: true
        })

        fabricRef.current = canvas
        isDisposing.current = false

        // Event handlers
        const handleObjectAdded = () => {
            if (isDisposing.current || isRestoring.current) return
            handleModified()
        }

        const handleSelection = (e: { selected?: fabric.FabricObject[] }) => {
            if (isDisposing.current) return
            const selected = e.selected?.[0] || null
            onSelectRef.current?.(selected)
        }

        const handleCleared = () => {
            if (isDisposing.current) return
            onSelectRef.current?.(null)
        }

        const handleMouseDown = (opt: fabric.TPointerEventInfo) => {
            if (isDisposing.current) return
            if (opt.target && opt.e) {
                opt.e.stopPropagation()
            }
        }

        canvas.on('object:modified', handleModified)
        canvas.on('object:added', handleObjectAdded)
        canvas.on('object:removed', handleModified)
        canvas.on('selection:created', handleSelection)
        canvas.on('selection:updated', handleSelection)
        canvas.on('selection:cleared', handleCleared)
        canvas.on('mouse:down', handleMouseDown)

        // Load initial data
        if (initialData && typeof initialData === 'object') {
            isRestoring.current = true
            canvas.loadFromJSON(initialData).then(() => {
                safeRender()
                isRestoring.current = false
            }).catch(() => {
                isRestoring.current = false
            })
        }

        // Set background image
        if (backgroundImage) {
            fabric.FabricImage.fromURL(backgroundImage, { crossOrigin: 'anonymous' }).then(img => {
                if (isDisposing.current || !fabricRef.current) return
                img.set({
                    originX: 'center',
                    originY: 'center',
                    left: width / 2,
                    top: height / 2,
                })

                // Calculate scale based on imageFit
                let scale = 1
                if (imageFit === 'contain') {
                    scale = Math.min(
                        width / (img.width || 1),
                        height / (img.height || 1)
                    )
                } else {
                    // cover
                    scale = Math.max(
                        width / (img.width || 1),
                        height / (img.height || 1)
                    )
                }

                img.scale(scale)
                canvas.backgroundImage = img
                safeRender()
            }).catch(console.error)
        }

        return () => {
            isDisposing.current = true
            if (fabricRef.current) {
                const canvasToDispose = fabricRef.current
                fabricRef.current = null
                canvasToDispose.isDrawingMode = false
                canvasToDispose.selection = false
                canvasToDispose.off()
                canvasToDispose.getObjects().forEach(obj => {
                    if (obj !== canvasToDispose.backgroundImage) {
                        canvasToDispose.remove(obj)
                    }
                })
                canvasToDispose.dispose().catch(() => { })
            }
        }
    }, [width, height, backgroundImage, imageFit, safeRender, handleModified])

    // Handle tool changes
    useEffect(() => {
        const canvas = fabricRef.current
        if (!canvas || isDisposing.current) return

        if (activeTool === 'draw' || activeTool === 'eraser') {
            canvas.isDrawingMode = true
            canvas.selection = false

            const brush = new fabric.PencilBrush(canvas)
            brush.color = activeTool === 'eraser' ? '#ffffff' : brushColor
            brush.width = brushWidth
            canvas.freeDrawingBrush = brush

            // Disable object selection during drawing
            canvas.forEachObject(obj => {
                obj.selectable = false
                obj.evented = false
            })
        } else {
            // select mode
            canvas.isDrawingMode = false
            canvas.selection = true

            canvas.forEachObject(obj => {
                obj.selectable = true
                obj.evented = true
            })
        }

        safeRender()
    }, [activeTool, brushColor, brushWidth, safeRender])

    // Handle commands
    useEffect(() => {
        if (!command || !fabricRef.current || isDisposing.current) return
        if (command.timestamp <= lastCommandTimestamp.current) return

        const canvas = fabricRef.current

        // Filter by pageId if specified
        if (command.payload?.pageId && command.payload.pageId !== pageId) return

        lastCommandTimestamp.current = command.timestamp

        switch (command.type) {
            case 'add-text': {
                const id = `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                const text = new fabric.IText('텍스트를 입력하세요', {
                    left: width / 2,
                    top: height / 2,
                    fontSize: 24,
                    fontFamily: '"Noto Sans KR", sans-serif',
                    fill: brushColor,
                    originX: 'center',
                    originY: 'center',
                })
                    ; (text as any).id = id
                canvas.add(text)
                canvas.setActiveObject(text)
                text.enterEditing()
                text.selectAll()
                safeRender()
                break
            }

            case 'add-image': {
                if (!command.payload?.url) break
                const id = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

                fabric.FabricImage.fromURL(command.payload.url, { crossOrigin: 'anonymous' }).then(img => {
                    if (isDisposing.current || !fabricRef.current) return
                        ; (img as any).id = id
                    img.set({
                        originX: 'center',
                        originY: 'center',
                        left: width / 2,
                        top: height / 2,
                    })

                    const fit = command.payload.fit || 'contain'
                    let scale = 1
                    if (fit === 'cover') {
                        scale = Math.max(width / (img.width || 1), height / (img.height || 1))
                    } else {
                        scale = Math.min(
                            (width * 0.8) / (img.width || 1),
                            (height * 0.8) / (img.height || 1)
                        )
                    }
                    img.scale(scale)
                    canvas.add(img)
                    canvas.setActiveObject(img)
                    safeRender()
                    handleModified()
                }).catch(console.error)
                break
            }

            case 'delete-selected': {
                const activeObjects = canvas.getActiveObjects()
                if (activeObjects.length > 0) {
                    canvas.remove(...activeObjects)
                    canvas.discardActiveObject()
                }
                safeRender()
                handleModified()
                onSelectRef.current?.(null)
                break
            }

            case 'update-object': {
                const activeObject = canvas.getActiveObject()
                if (activeObject && command.payload) {
                    activeObject.set(command.payload)
                    safeRender()
                    handleModified()
                }
                break
            }

            case 'clear-all': {
                canvas.getObjects().forEach(obj => {
                    canvas.remove(obj)
                })
                canvas.discardActiveObject()
                safeRender()
                handleModified()
                break
            }
        }
    }, [command, width, height, brushColor, pageId, safeRender, handleModified])

    return (
        <div className="w-full h-full relative overflow-hidden bg-white">
            <canvas ref={canvasRef} />
        </div>
    )
}
