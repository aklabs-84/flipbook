import { create } from 'zustand'
import { Database } from '../types/supabase'
import { supabase } from '../lib/supabase'

type Page = Database['public']['Tables']['pages']['Row']
type BookRow = Database['public']['Tables']['books']['Row']

// Helper to calculate total leaves based on book type
const calculateTotalLeaves = (pageCount: number, bookType: string) => {
    if (bookType === 'storybook') {
        // Storybook: 3 Extra Leaves
        // 1. Front (Leaf 0)
        // 2. Inside Front + Padding (Leaf 1)
        // ... Content Leaves (N) ...
        // 3. Inside Back + Back (Leaf N+2) -> Wait
        // Let's re-verify formula: N=1 -> 4 Leaves. 1+3=4. Correct.
        // N=4 -> 7 Leaves. 4+3=7. Correct.
        return pageCount + 3
    }
    // Standard: (N + 4) / 2
    return Math.ceil((pageCount + 4) / 2)
}

interface BookState {
    pages: Page[]
    currentLeaf: number
    totalLeaves: number
    isRtl: boolean
    title: string
    bookType: 'image' | 'pdf' | 'storybook' // Added bookType
    passwordHash: string | null
    isPublic: boolean
    coverUrl: string | null
    bgmUrl: string | null
    createdAt: string | null // Added createdAt


    // ... Actions
    setPages: (pages: Page[]) => void
    flipTo: (leaf: number) => void
    addPage: (page: Page) => void
    removePage: (pageId: string) => void
    setIsRtl: (isRtl: boolean) => void
    setTitle: (title: string) => void
    checkPassword: (password: string) => Promise<boolean>
    resetBook: () => void

    fetchUserBooks: (userId: string) => Promise<BookRow[]>
    fetchPublicBooks: () => Promise<BookRow[]>
    createBook: (userId: string, title: string) => Promise<string | null> // Default to storybook
    createBookFromPDF: (userId: string, title: string, file: File, onProgress?: (progress: number) => void) => Promise<string | null>
    createBookFromImages: (userId: string, title: string, files: File[], onProgress?: (progress: number) => void) => Promise<string | null>
    addNewPage: (bookId: string) => Promise<void>
    deleteBook: (bookId: string) => Promise<void>
    updateBookTitle: (bookId: string, newTitle: string) => Promise<void>

    updateBookSettings: (bookId: string, settings: { isPublic: boolean, password?: string | null, coverUrl?: string | null, bgmUrl?: string | null }) => Promise<void>

    fetchBookDetails: (bookId: string, preservePage?: boolean) => Promise<void>
    updatePage: (pageId: string, updates: Partial<Page>) => void
    savePageChanges: (pageId: string, updates: Partial<Page>) => Promise<void>
    deletePage: (pageId: string) => Promise<void> // Added deletePage
    reorderPages: (newOrderPages: Page[]) => Promise<void>

    initDummyData: () => void // New Action for testing
}

export const useBookStore = create<BookState>((set, get) => ({
    pages: [],
    currentLeaf: 0,
    totalLeaves: 0,
    isRtl: false,
    title: 'Untitled Book',
    bookType: 'image', // Default
    passwordHash: null,
    isPublic: false,
    coverUrl: null,
    bgmUrl: null,
    createdAt: null,


    setPages: (pages: Page[]) => set((state) => ({ pages, totalLeaves: calculateTotalLeaves(pages.length, state.bookType) })), // Updated for Cover Layout

    flipTo: (leaf: number) => set((state) => ({
        currentLeaf: Math.max(0, Math.min(leaf, state.totalLeaves))
    })),

    addPage: (page: Page) => set((state) => {
        const newPages = [...state.pages, page]
        return {
            pages: newPages,
            totalLeaves: calculateTotalLeaves(newPages.length, state.bookType)
        }
    }),

    removePage: (pageId: string) => set((state) => {
        const newPages = state.pages.filter(p => p.id !== pageId)
        return {
            pages: newPages,
            totalLeaves: calculateTotalLeaves(newPages.length, state.bookType)
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
        bookType: 'image',
        passwordHash: null,
        isPublic: false,
        coverUrl: null,
        bgmUrl: null,
        createdAt: null
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
            alert(`책 목록을 불러오지 못했습니다: ${error.message}`) // Alert user to see the error
            return []
        }
        console.log("Fetched books:", data) // Log success
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
        // 1. Create Book (Storybook Mode)
        const { data: bookData, error: bookError } = await supabase
            .from('books')
            .insert({ user_id: userId, title, is_rtl: false, book_type: 'storybook' })
            .select()
            .single()

        if (bookError || !bookData) {
            console.error('Error creating book (Insert failed):', bookError)
            alert(`책 생성(DB 저장) 실패: ${bookError?.message || 'Unknown error'}`) // Direct alert for better debugging
            return null
        }

        // 2. Create Initial Pages (Cover + 3 Empty Pages = 4 total)
        // Store empty JSON for storybook pages
        const initialPages = Array.from({ length: 4 }).map((_, i) => ({
            book_id: bookData.id,
            page_number: i + 1,
            text_layers: [], // Storybook pages might use this, or we add content column later
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

            // 2. Create Book (PDF Type)
            const { data: bookData, error: bookError } = await supabase
                .from('books')
                .insert({ user_id: userId, title, is_rtl: false, book_type: 'pdf' })
                .select()
                .single()

            if (bookError || !bookData) {
                console.error('Error creating book (PDF Mode):', bookError)
                throw bookError
            }
            onProgress?.(40)

            // 2. Upload Images & Prepare Pages (with concurrency limit)
            const { uploadMedia } = await import('../services/storageService')

            // Chunked upload to prevent overwhelming the network/server
            const chunk = (arr: any[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
                    arr.slice(i * size, i * size + size)
                )

            const uploadedPages = []
            const batches = chunk(images, 3) // Upload 3 at a time

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                const batchResults = await Promise.all(batch.map(async (blob, batchIndex) => {
                    const globalIndex = i * 3 + batchIndex
                    const imageFile = new File([blob], `page_${globalIndex + 1}.jpg`, { type: 'image/jpeg' })
                    const folderPath = `${userId}/${bookData.id}`

                    try {
                        const publicUrl = await uploadMedia(imageFile, 'uploads', folderPath)
                        return {
                            book_id: bookData.id,
                            page_number: globalIndex + 1,
                            text_layers: [],
                            layout_preset: 'full',
                            media_url: publicUrl,
                            media_type: 'image' as const,
                            image_fit: 'contain' as const
                        }
                    } catch (e) {
                        console.error(`Failed to upload page ${globalIndex + 1}:`, e)
                        throw e
                    }
                }))
                uploadedPages.push(...batchResults)
                // Update progress based on completed batches
                onProgress?.(40 + Math.floor((i + 1) / batches.length * 50))
            }

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

    createBookFromImages: async (userId: string, title: string, files: File[], onProgress?: (p: number) => void) => {
        try {
            if (files.length === 0) throw new Error("No files selected")
            onProgress?.(10)

            // 1. Create Book (Image Type)
            const { data: bookData, error: bookError } = await supabase
                .from('books')
                .insert({ user_id: userId, title, is_rtl: false, book_type: 'image' })
                .select()
                .single()

            if (bookError || !bookData) {
                console.error('Error creating book (Image Mode):', bookError)
                throw bookError
            }
            onProgress?.(20)

            // 2. Upload Images & Prepare Pages (with concurrency limit)
            const { uploadMedia } = await import('../services/storageService')

            const chunk = (arr: any[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
                    arr.slice(i * size, i * size + size)
                )

            const uploadedPages = []
            const batches = chunk(files, 3)

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                const batchResults = await Promise.all(batch.map(async (file, batchIndex) => {
                    const globalIndex = i * 3 + batchIndex
                    const folderPath = `${userId}/${bookData.id}`

                    try {
                        const publicUrl = await uploadMedia(file, 'uploads', folderPath)
                        return {
                            book_id: bookData.id,
                            page_number: globalIndex + 1,
                            text_layers: [],
                            layout_preset: 'full',
                            media_url: publicUrl,
                            media_type: 'image' as const,
                            image_fit: 'contain' as const
                        }
                    } catch (e) {
                        console.error(`Failed to upload file ${file.name}:`, e)
                        throw e
                    }
                }))
                uploadedPages.push(...batchResults)
                onProgress?.(20 + Math.floor((i + 1) / batches.length * 60))
            }

            // 3. Batch Insert Pages
            const { error: pageError } = await supabase
                .from('pages')
                .insert(uploadedPages)

            if (pageError) throw pageError

            onProgress?.(100)
            return bookData.id

        } catch (error) {
            console.error('Error creating book from images:', error)
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
        set((state) => {
            const updatedPages = [...state.pages, ...data]
            return {
                pages: updatedPages,
                totalLeaves: calculateTotalLeaves(updatedPages.length, state.bookType)
            }
        })
    },

    deleteBook: async (bookId: string) => {
        const { deleteFolder } = await import('../services/storageService')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.error('User not authenticated, cannot delete folder')
            return
        }

        // Delete the entire book folder
        // Note: storageService now might need to be robust. 
        await deleteFolder(`${user.id}/${bookId}`, 'uploads')
        console.log(`Successfully purged folder: ${user.id}/${bookId}`)

        // 3. Delete Book (Manual Cascade: Delete pages first)
        // Note: Even if you have 'ON DELETE CASCADE', we explicitly delete to run triggers or ensure clean slate if RLS policies are tricky.
        const { error: pagesDeleteError } = await supabase
            .from('pages')
            .delete()
            .eq('book_id', bookId)

        if (pagesDeleteError) {
            console.error('Error deleting pages:', pagesDeleteError)
            // We continue to try deleting the book, as pages might have been deleted already
        }

        const { error: bookDeleteError } = await supabase
            .from('books')
            .delete()
            .eq('id', bookId)

        if (bookDeleteError) {
            console.error('Error deleting book record:', bookDeleteError)
            throw bookDeleteError
        }
    },

    deletePage: async (pageId: string) => {
        // 1. Get Page Info to find media
        const { data: page, error: fetchError } = await supabase
            .from('pages')
            .select('*')
            .eq('id', pageId)
            .single()

        if (fetchError || !page) {
            console.error('Error fetching page to delete:', fetchError)
            return
        }

        // 2. Delete media from storage if exists
        if (page.media_url) {
            // Extract path from URL? Or just rely on URL if storage helper handles it.
            // Our storageService `deleteFile` expects a path.
            // But we might need to extract it. 
            // Actually, let's just delete the DB record. Storage cleanup can be a separate maintenance task or triggered via Edge Function.
            // For now, to keep it simple and safe, we just delete the row.
        }

        // 3. Delete from DB
        const { error: deleteError } = await supabase
            .from('pages')
            .delete()
            .eq('id', pageId)

        if (deleteError) {
            console.error('Error deleting page:', deleteError)
            alert('페이지 삭제 실패')
            return
        }

        // 4. Update Local State (Remove and Re-index?)
        // Actually, removing a page shifts numbers. 
        // We should probably re-fetch or manually adjust local state.

        set((state) => {
            const newPages = state.pages.filter(p => p.id !== pageId)
            // Re-assign page numbers?
            // Ideally backend triggers or we do it here. 
            // Let's just remove for now, seeing as "Page Number" is mostly display.
            return {
                pages: newPages,
                totalLeaves: calculateTotalLeaves(newPages.length, state.bookType)
            }
        })
    },

    updateBookTitle: async (bookId: string, newTitle: string) => {
        // Optimistic update
        set(() => ({ title: newTitle }))

        const { error } = await supabase
            .from('books')
            .update({ title: newTitle })
            .eq('id', bookId)

        if (error) {
            console.error('Error updating book title:', error)
            // Revert title if needed, but for now we assume success or user will retry
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

        if (settings.bgmUrl !== undefined) {
            updates.bgm_url = settings.bgmUrl
        }

        // Optimistic Update
        set((state) => ({
            ...state,
            isPublic: settings.isPublic,
            passwordHash: settings.password !== undefined ? settings.password : state.passwordHash,
            coverUrl: settings.coverUrl !== undefined ? settings.coverUrl : state.coverUrl,
            bgmUrl: settings.bgmUrl !== undefined ? settings.bgmUrl : state.bgmUrl
        }))

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
            bookType: book.book_type || 'image', // Backward compatibility
            pages: pages || [],
            totalLeaves: calculateTotalLeaves((pages || []).length, book.book_type || 'image'),
            currentLeaf: preservePage ? state.currentLeaf : 0,
            passwordHash: book.password_hash,
            isPublic: book.is_public,
            coverUrl: book.cover_url,
            bgmUrl: book.bgm_url,
            createdAt: book.created_at
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
            // Ignore AbortError which happens on navigation/unmount
            if (error.message?.includes('AbortError') || error.details?.includes('AbortError')) {
                return
            }
            console.error('Error saving page:', error)
        }
    },

    reorderPages: async (newOrderPages: Page[]) => {
        // 1. Optimistic update
        set(() => ({
            pages: newOrderPages
        }))

        // 2. Prepare updates for DB
        // We only need to update page_number for pages that changed position
        // But to be safe and simple, we upsert all with new page_numbers
        const updates = newOrderPages.map((page, index) => ({
            id: page.id,
            book_id: page.book_id,
            page_number: index + 1,
            // We need to keep other required fields if using upsert, 
            // but 'update' needs a primary key match. 
            // Supabase upsert works if we provide primary key.
            // We should be careful not to overwrite other fields if we pass partial data.
            // Actually, we can just .upsert({ id: ..., page_number: ... }) if we don't want to touch others?
            // No, standard SQL update is better if we iterate.
            // But iteration is slow. 
            // Let's use upsert with just the changing fields? 
            // No, upsert needs all non-nullable fields if it inserts, but here we update.
            // Safe bet: .upsert([...]) with strict match?
            // Let's iterate updates for now, or use a customized RPC if performance matters. 
            // For < 100 pages, generic iteration is okay-ish, or Promise.all.
        }))

        // Optimized: Create a set of updates
        try {
            const { error } = await supabase
                .from('pages')
                .upsert(
                    updates.map(u => ({
                        id: u.id,
                        book_id: u.book_id,
                        page_number: u.page_number,
                        updated_at: new Date().toISOString()
                    })),
                    { onConflict: 'id' }
                )

            if (error) {
                console.error('Error reordering pages:', error)
                // Revert or alert?
            }
        } catch (e) {
            console.error('Exception reordering pages:', e)
        }
    },

    initDummyData: () => set({
        totalLeaves: calculateTotalLeaves(4, 'storybook'),
        currentLeaf: 0,
        createdAt: new Date().toISOString(),
        bookType: 'storybook', // Default to storybook for new projects
        pages: [
            { id: '1', book_id: '1', page_number: 1, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
            { id: '2', book_id: '1', page_number: 2, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
            { id: '3', book_id: '1', page_number: 3, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
            { id: '4', book_id: '1', page_number: 4, media_url: null, media_type: null, text_layers: [], layout_preset: 'full', created_at: '' },
        ]
    })
}))
