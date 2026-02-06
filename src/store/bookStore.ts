import { create } from 'zustand'
import { Database } from '../types/supabase'
import { supabase } from '../lib/supabase'

type Page = Database['public']['Tables']['pages']['Row'] & { image_fit?: 'cover' | 'contain' }
type BookRow = Database['public']['Tables']['books']['Row']

interface BookState {
    pages: Page[]
    currentLeaf: number
    totalLeaves: number
    isRtl: boolean
    title: string
    passwordHash: string | null
    isPublic: boolean
    coverUrl: string | null

    // ... Actions
    setIsRtl: (isRtl: boolean) => void
    setTitle: (title: string) => void
    checkPassword: (password: string) => Promise<boolean>
    resetBook: () => void

    fetchUserBooks: (userId: string) => Promise<BookRow[]>
    fetchPublicBooks: () => Promise<BookRow[]>
    createBook: (userId: string, title: string) => Promise<string | null>
    createBookFromPDF: (userId: string, title: string, file: File, onProgress?: (progress: number) => void) => Promise<string | null>
    addNewPage: (bookId: string) => Promise<void>
    deleteBook: (bookId: string) => Promise<void>
    updateBookTitle: (bookId: string, newTitle: string) => Promise<void>

    updateBookSettings: (bookId: string, settings: { isPublic: boolean, password?: string | null, coverUrl?: string | null }) => Promise<void>

    fetchBookDetails: (bookId: string, preservePage?: boolean) => Promise<void>
    updatePage: (pageId: string, updates: Partial<Page>) => void
    savePageChanges: (pageId: string, updates: Partial<Page>) => Promise<void>

    initDummyData: () => void // New Action for testing
}

export const useBookStore = create<BookState>((set, get) => ({
    pages: [],
    currentLeaf: 0,
    totalLeaves: 0,
    isRtl: false,
    title: 'Untitled Book',
    passwordHash: null,
    isPublic: false,
    coverUrl: null,

    setPages: (pages: Page[]) => set({ pages, totalLeaves: Math.ceil(pages.length / 2) }), // Assume 1 Page object = 1 Leaf (Front+Back)

    flipTo: (leaf: number) => set((state) => ({
        currentLeaf: Math.max(0, Math.min(leaf, state.totalLeaves))
    })),

    addPage: (page: Page) => set((state) => {
        const newPages = [...state.pages, page]
        return {
            pages: newPages,
            totalLeaves: Math.ceil(newPages.length / 2)
        }
    }),

    removePage: (pageId: string) => set((state) => {
        const newPages = state.pages.filter(p => p.id !== pageId)
        return {
            pages: newPages,
            totalLeaves: Math.ceil(newPages.length / 2)
        }
    }),

    updatePage: (pageId: string, updates: Partial<Page>) => set((state) => ({
        pages: state.pages.map(p => p.id === pageId ? { ...p, ...updates } : p)
    })),

    setIsRtl: (isRtl: boolean) => set({ isRtl }),
    setTitle: (title: string) => set({ title }),

    checkPassword: async (password: string) => {
        const state = get()
        // In a real app, use bcrypt compare on server.
        // For MVP, simple string comparison with stored 'hash' (plaintext).
        return state.passwordHash === password
    },

    resetBook: () => set({
        pages: [],
        currentLeaf: 0,
        totalLeaves: 0,
        title: 'Loading...',
        isRtl: false,
        passwordHash: null,
        isPublic: false,
        coverUrl: null
    }),

    // --- Supabase Actions ---

    fetchUserBooks: async (userId: string) => {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching books:', error)
            return []
        }
        return data || []
    },

    fetchPublicBooks: async () => {
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching public books:', error)
            return []
        }
        return data || []
    },

    createBook: async (userId: string, title: string) => {
        // 1. Create Book
        const { data: bookData, error: bookError } = await supabase
            .from('books')
            .insert({ user_id: userId, title, is_rtl: false })
            .select()
            .single()

        if (bookError || !bookData) {
            console.error('Error creating book:', bookError)
            return null
        }

        // 2. Create Initial Pages (Cover + 3 Empty Pages = 4 total)
        // In our model, Leaf 1 (Cover) = Page 1. Leaf 2 = Page 2...
        const initialPages = Array.from({ length: 4 }).map((_, i) => ({
            book_id: bookData.id,
            page_number: i + 1,
            text_layers: [],
            layout_preset: 'full'
        }))

        const { error: pageError } = await supabase
            .from('pages')
            .insert(initialPages)

        if (pageError) {
            console.error('Error creating pages:', pageError)
        }

        return bookData.id
    },

    createBookFromPDF: async (userId: string, title: string, file: File, onProgress?: (p: number) => void) => {
        try {
            // 1. Convert PDF to Images
            const { convertPDFToImages } = await import('../services/pdfService')
            onProgress?.(10)
            const images = await convertPDFToImages(file)

            if (images.length === 0) throw new Error("No images extracted from PDF")
            onProgress?.(30)

            // 2. Create Book
            const { data: bookData, error: bookError } = await supabase
                .from('books')
                .insert({ user_id: userId, title, is_rtl: false })
                .select()
                .single()

            if (bookError || !bookData) throw bookError
            onProgress?.(40)

            // 3. Upload Images & Prepare Pages
            const { uploadMedia } = await import('../services/storageService')

            const uploadedPages = await Promise.all(images.map(async (blob, index) => {
                const imageFile = new File([blob], `page_${index + 1}.jpg`, { type: 'image/jpeg' })
                const folderPath = `${userId}/${bookData.id}`
                const publicUrl = await uploadMedia(imageFile, 'uploads', folderPath)

                return {
                    book_id: bookData.id,
                    page_number: index + 1,
                    text_layers: [],
                    layout_preset: 'full',
                    media_url: publicUrl,
                    media_type: 'image' as const,
                    image_fit: 'contain'
                }
            }))

            onProgress?.(90)

            // 4. Batch Insert Pages
            const { error: pageError } = await supabase
                .from('pages')
                .insert(uploadedPages)

            if (pageError) throw pageError

            onProgress?.(100)
            return bookData.id

        } catch (error) {
            console.error('Error creating book from PDF:', error)
            return null
        }
    },

    addNewPage: async (bookId: string) => {
        const state = get()
        const currentPages = state.pages
        const lastPageNumber = currentPages.length > 0 ? currentPages[currentPages.length - 1].page_number : 0

        // Add 2 pages (1 Leaf)
        const newPagesData = [
            {
                book_id: bookId,
                page_number: lastPageNumber + 1,
                text_layers: [],
                layout_preset: 'full'
            },
            {
                book_id: bookId,
                page_number: lastPageNumber + 2,
                text_layers: [],
                layout_preset: 'full'
            }
        ]

        const { data, error } = await supabase
            .from('pages')
            .insert(newPagesData)
            .select()

        if (error || !data) {
            console.error('Error adding pages:', error)
            return
        }

        // Update Store
        set((state) => ({
            pages: [...state.pages, ...data],
            totalLeaves: Math.ceil(([...state.pages, ...data]).length / 2)
        }))
    },

    deleteBook: async (bookId: string) => {
        // 1. Identify files to delete
        const { data: pages } = await supabase
            .from('pages')
            .select('media_url')
            .eq('book_id', bookId)
            .not('media_url', 'is', null)

        if (pages && pages.length > 0) {
            const filesToDelete = pages
                .map(p => p.media_url)
                .filter((url): url is string => !!url)
                .map(url => {
                    const parts = url.split('/')
                    return parts[parts.length - 1]
                })

            if (filesToDelete.length > 0) {
                const { deleteFiles } = await import('../services/storageService')
                await deleteFiles(filesToDelete, 'uploads')
                console.log(`Deleted ${filesToDelete.length} images from storage.`)
            }
        }

        // 2. Delete Book (Cascade deletes pages)
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', bookId)

        if (error) {
            console.error('Error deleting book:', error)
            return
        }
    },

    updateBookTitle: async (bookId: string, newTitle: string) => {
        const { error } = await supabase
            .from('books')
            .update({ title: newTitle })
            .eq('id', bookId)

        if (error) {
            console.error('Error updating book title:', error)
            return
        }
    },

    updateBookSettings: async (bookId, settings) => {
        const updates: any = {
            is_public: settings.isPublic,
            updated_at: new Date().toISOString()
        }

        if (settings.password !== undefined) {
            updates.password_hash = settings.password
        }

        if (settings.coverUrl !== undefined) {
            updates.cover_url = settings.coverUrl
        }

        const { error } = await supabase
            .from('books')
            .update(updates)
            .eq('id', bookId)

        if (error) {
            console.error('Error updating book settings:', error)
            throw error
        }
    },

    fetchBookDetails: async (bookId, preservePage = false) => {
        // 1. Fetch Book Info
        const { data: book, error: bookError } = await supabase
            .from('books')
            .select('*')
            .eq('id', bookId)
            .single()

        if (bookError) {
            console.error('Error fetching book:', bookError)
            return
        }

        // 2. Fetch Pages
        const { data: pages, error: pageError } = await supabase
            .from('pages')
            .select('*')
            .eq('book_id', bookId)
            .order('page_number', { ascending: true })

        if (pageError) {
            console.error('Error fetching pages:', pageError)
            return
        }

        const state = get()
        set({
            title: book.title,
            isRtl: book.is_rtl,
            pages: pages || [],
            totalLeaves: Math.ceil((pages || []).length / 2),
            currentLeaf: preservePage ? state.currentLeaf : 0,
            passwordHash: book.password_hash,
            isPublic: book.is_public,
            coverUrl: book.cover_url
        })
    },

    savePageChanges: async (pageId: string, updates: Partial<Page>) => {
        // Optimistic Update
        get().updatePage(pageId, updates)

        // DB Update
        const { error } = await supabase
            .from('pages')
            .update(updates)
            .eq('id', pageId)

        if (error) {
            console.error('Error saving page:', error)
        }
    },

    initDummyData: () => set({
        totalLeaves: 4,
        currentLeaf: 0,
        pages: [
            { id: '1', book_id: '1', page_number: 1, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
            { id: '2', book_id: '1', page_number: 2, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
            { id: '3', book_id: '1', page_number: 3, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
            { id: '4', book_id: '1', page_number: 4, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
        ]
    })
}))
