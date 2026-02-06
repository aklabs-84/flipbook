import { create } from 'zustand'

export interface TextLayer {
    id: string
    text: string
    x: number // Percentage (0-100)
    y: number // Percentage (0-100)
    fontSize: number
    color: string
    fontFamily: string
    fontWeight?: string
    align?: 'left' | 'center' | 'right'
}

interface EditorState {
    selectedLayerId: string | null
    isEditingText: boolean // True when typing/editing text content

    setSelectedLayer: (id: string | null) => void
    setIsEditingText: (isEditing: boolean) => void
}

export const useEditorStore = create<EditorState>((set) => ({
    selectedLayerId: null,
    isEditingText: false,

    setSelectedLayer: (id) => set({ selectedLayerId: id }),
    setIsEditingText: (isEditing) => set({ isEditingText: isEditing })
}))

