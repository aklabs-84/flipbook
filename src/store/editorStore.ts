import { create } from 'zustand'

// Fabric.js 객체 타입 (참조용)
export type FabricObjectType = 'i-text' | 'image' | 'path' | 'rect' | 'circle' | 'group'

// AnyLayer는 Fabric.js JSON 객체를 나타냄 (하위 호환성)
export interface AnyLayer {
    id?: string
    type?: string
    [key: string]: any
}

// 에디터 도구 타입 단순화
// - 'select': 객체 선택/이동/편집 (기본)
// - 'draw': 자유 그리기
// - 'eraser': 지우개
export type EditorTool = 'select' | 'draw' | 'eraser'

interface EditorState {
    // 현재 선택된 Fabric 객체 ID
    selectedLayerId: string | null
    // 현재 활성 도구
    activeTool: EditorTool
    // 브러시 설정
    brushColor: string
    brushWidth: number

    // Actions
    setSelectedLayer: (id: string | null) => void
    setActiveTool: (tool: EditorTool) => void
    setBrushColor: (color: string) => void
    setBrushWidth: (width: number) => void
    resetEditor: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
    selectedLayerId: null,
    activeTool: 'select',
    brushColor: '#374151',
    brushWidth: 3,

    setSelectedLayer: (id) => set({ selectedLayerId: id }),
    setActiveTool: (tool) => set({ activeTool: tool }),
    setBrushColor: (color) => set({ brushColor: color }),
    setBrushWidth: (width) => set({ brushWidth: width }),
    resetEditor: () => set({
        selectedLayerId: null,
        activeTool: 'select',
        brushColor: '#374151',
        brushWidth: 3
    })
}))

