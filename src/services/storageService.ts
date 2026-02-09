import { supabase } from '../lib/supabase'

export const uploadMedia = async (file: File, bucket: string = 'uploads', folderPath: string = '') => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timed out after 30s')), 30000)
    })

    const uploadPromise = supabase.storage
        .from(bucket)
        .upload(fullPath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream',
            duplex: 'half'
        })

    const result = await Promise.race([uploadPromise, timeoutPromise]) as any
    const { error } = result

    if (error) {
        console.error('Supabase Upload Error:', error)
        throw error
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fullPath)

    return publicUrlData.publicUrl
}

export const deleteFiles = async (filePaths: string[], bucket: string = 'uploads') => {
    if (filePaths.length === 0) return

    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove(filePaths)

        if (error) {
            console.error('Error deleting files:', error)
            throw error
        }
    } catch (error) {
        console.error('Error deleting files from storage:', error)
    }
}

export const deleteFolder = async (folderPath: string, bucket: string = 'uploads') => {
    try {
        let hasMore = true
        const BATCH_SIZE = 100

        while (hasMore) {
            // 1. List files
            const { data: files, error: listError } = await supabase.storage
                .from(bucket)
                .list(folderPath, {
                    limit: BATCH_SIZE,
                    offset: 0, // Always 0 because we delete them as we go!
                    sortBy: { column: 'name', order: 'asc' },
                })

            if (listError) throw listError
            if (!files || files.length === 0) {
                hasMore = false
                break
            }

            // 2. Prepare paths to delete
            const filesToDelete = files
                .filter(f => f.id !== null) // Files
                .map(f => `${folderPath}/${f.name}`)

            // Delete files in this batch
            if (filesToDelete.length > 0) {
                const { error: removeError } = await supabase.storage
                    .from(bucket)
                    .remove(filesToDelete)

                if (removeError) throw removeError
                console.log(`Deleted ${filesToDelete.length} files from ${folderPath}`)
            }

            // 3. Handle Subfolders (if any pseudo-folders act as objects)
            // Note: Supabase Storage list is shallow. If there are subfolders, they might appear with id=null?
            // Usually in Supabase 'folders' are just prefixes. 
            // If 'f.id' is null, it might be a folder using the S3 adapter logic.
            const subFolders = files.filter(f => f.id === null)
            for (const folder of subFolders) {
                await deleteFolder(`${folderPath}/${folder.name}`, bucket)
            }

            // If we deleted everything in this batch and it was full, there might be more (if logic wasn't "delete as we go").
            // Since we deleted the files, the next list(offset:0) will catch new ones if they existed but weren't returned?
            // Actually, list() on flat hierarchy with prefix returns all matches. 
            // If we delete them, next list() should return empty.
            // But checking length < BATCH_SIZE is safer to stop.
            if (files.length < BATCH_SIZE) {
                hasMore = false
            }
        }
    } catch (error) {
        console.error('Error deleting folder:', error)
        throw error
    }
}
