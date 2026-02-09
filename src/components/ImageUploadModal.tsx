import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Image as ImageIcon, Trash2 } from 'lucide-react'

interface ImageUploadModalProps {
    isOpen: boolean
    onClose: () => void
    initialFiles: File[]
    onUpload: (files: File[]) => void
    isUploading: boolean
}

export default function ImageUploadModal({ isOpen, onClose, initialFiles, onUpload, isUploading }: ImageUploadModalProps) {
    const [files, setFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen && initialFiles.length > 0) {
            setFiles(initialFiles)
        }
        // If closed, we don't necessarily need to clear immediately to avoid flicker, 
        // but typically we should reset when opening or closing.
        // Let's reset on close to be safe.
        if (!isOpen) {
            setFiles([])
        }
    }, [isOpen, initialFiles])

    useEffect(() => {
        // Generate previews whenever files change
        const newPreviews = files.map(file => URL.createObjectURL(file))
        setPreviews(prev => {
            prev.forEach(url => URL.revokeObjectURL(url))
            return newPreviews
        })

        return () => {
            newPreviews.forEach(url => URL.revokeObjectURL(url))
        }
    }, [files])

    const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            setFiles(prev => [...prev, ...newFiles])
        }
        // Reset input to allow selecting same file again
        if (inputRef.current) inputRef.current.value = ''
    }

    const handleRemove = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    if (!isOpen) return null

    const content = (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-black text-earth-brown mb-1 tracking-tight">이미지 업로드 확인</h2>
                        <p className="text-earth-brown/60 text-sm font-medium">총 <span className="text-brand-purple font-bold">{files.length}</span>장의 이미지가 선택되었습니다</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-earth-brown disabled:opacity-50"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Grid */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {/* Add Button */}
                        <button
                            onClick={() => inputRef.current?.click()}
                            disabled={isUploading}
                            className="aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3 hover:border-brand-purple hover:bg-brand-purple/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-brand-purple group-hover:text-white transition-colors text-gray-400 shadow-sm">
                                <Plus className="w-7 h-7" />
                            </div>
                            <span className="text-sm font-bold text-gray-400 group-hover:text-brand-purple transition-colors">추가하기</span>
                        </button>

                        {/* Image Cards */}
                        {files.map((file, index) => (
                            <div key={`file-${index}`} className="relative group aspect-[3/4] bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-200/50 hover:border-brand-purple/30 overflow-hidden flex flex-col transition-all duration-300">
                                <div className="flex-1 relative overflow-hidden bg-gray-100">
                                    <img
                                        src={previews[index]}
                                        alt={file.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => handleRemove(index)}
                                            disabled={isUploading}
                                            className="w-10 h-10 flex items-center justify-center bg-white rounded-full text-red-500 hover:bg-red-500 hover:text-white shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                                            title="제거"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="px-3 py-2 bg-white border-t border-gray-50 flex items-center justify-between">
                                    <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold leading-none">
                                        {index + 1}
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {files.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[300px]">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                                <ImageIcon className="w-10 h-10" />
                            </div>
                            <p className="text-lg font-bold text-gray-500">선택된 이미지가 없습니다</p>
                            <p className="text-sm text-gray-400 mt-1">이미지를 추가하여 플립북을 만들어보세요</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-end items-center gap-3 sticky bottom-0 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors font-bold disabled:opacity-50 text-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => onUpload(files)}
                        disabled={files.length === 0 || isUploading}
                        className="px-8 py-3 bg-brand-purple text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-sm transform active:scale-95"
                    >
                        {isUploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>업로드 중...</span>
                            </>
                        ) : (
                            <>
                                <span>{files.length}장 업로드 하기</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>

                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    ref={inputRef}
                    onChange={handleAddMore}
                />
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
