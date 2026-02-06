import { supabase } from '../lib/supabase'

export const uploadMedia = async (file: File, bucket: string = 'uploads', folderPath: string = '') => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName

    const { error } = await supabase.storage
        .from(bucket)
        .upload(fullPath, file)

    if (error) {
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
