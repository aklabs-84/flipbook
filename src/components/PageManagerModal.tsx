import React, { useState } from 'react'
import { X, Trash2, FileText, Minimize, Maximize, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useBookStore } from '../store/bookStore'
import ConfirmationModal from './ConfirmationModal'

interface PageManagerModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function PageManagerModal({ isOpen, onClose }: PageManagerModalProps) {
    const { pages, deletePage, reorderPages, bookType } = useBookStore()
    const [pageToDelete, setPageToDelete] = useState<string | null>(null)

    if (!isOpen) return null

    const handleDeleteClick = (e: React.MouseEvent, pageId: string) => {
        e.stopPropagation()
        setPageToDelete(pageId)
    }

    const handleConfirmDelete = async () => {
        if (pageToDelete) {
            await deletePage(pageToDelete)
            setPageToDelete(null)
        }
    }

    const movePage = (e: React.MouseEvent, index: number, direction: 'prev' | 'next') => {
        e.stopPropagation() // Prevent drag
        if (direction === 'prev' && index === 0) return
        if (direction === 'next' && index === pages.length - 1) return

        const newPages = [...pages]
        const targetIndex = direction === 'prev' ? index - 1 : index + 1

        // Swap
        const temp = newPages[index]
        newPages[index] = newPages[targetIndex]
        newPages[targetIndex] = temp

        reorderPages(newPages)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-black text-earth-brown mb-1">페이지 관리</h2>
                        <p className="text-sm text-gray-500">드래그하여 페이지 순서를 변경할 수 있습니다.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Grid Content with Reorder */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                    <div
                        className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-8 px-4"
                    >
                        {pages.map((page, index) => (
                            <div
                                key={page.id}
                                className="group relative aspect-[3/4] bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-brand-purple/50 transition-all hover:shadow-lg overflow-hidden flex flex-col"
                            >
                                {/* Page Number Badge */}
                                <div className="absolute top-3 left-3 min-w-[2rem] h-8 px-2 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xs font-bold z-20 pointer-events-none">
                                    {bookType === 'storybook'
                                        ? `${index * 2 + 1}-${index * 2 + 2}`
                                        : index + 1
                                    }
                                </div>

                                {/* Preview */}
                                <div className="flex-1 relative bg-white flex items-center justify-center overflow-hidden pointer-events-none">
                                    {page.media_url ? (
                                        <img
                                            src={page.media_url}
                                            alt={`Page ${index + 1}`}
                                            className={`w-full h-full bg-gray-100 ${(() => {
                                                try {
                                                    const data = typeof page.text_layers === 'string'
                                                        ? JSON.parse(page.text_layers)
                                                        : page.text_layers
                                                    return data?.imageFit === 'cover' ? 'object-cover' : 'object-contain'
                                                } catch {
                                                    return 'object-contain'
                                                }
                                            })()}`}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-300">
                                            <FileText className="w-8 h-8" />
                                            <span className="text-xs font-medium">텍스트 페이지</span>
                                        </div>
                                    )}
                                </div>

                                {/* Reorder Arrows (Visible on Hover) */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => movePage(e, index, 'prev')}
                                        disabled={index === 0}
                                        className={`p-1.5 rounded-full shadow-md bg-white border border-gray-200 text-gray-700 hover:bg-brand-orange hover:text-white transition-all hover:scale-110 ${index === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                                        title="이전 순서로 이동"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => movePage(e, index, 'next')}
                                        disabled={index === pages.length - 1}
                                        className={`p-1.5 rounded-full shadow-md bg-white border border-gray-200 text-gray-700 hover:bg-brand-orange hover:text-white transition-all hover:scale-110 ${index === pages.length - 1 ? 'opacity-0 pointer-events-none' : ''}`}
                                        title="다음 순서로 이동"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Image Controls (Show on Hover) */}
                                {page.media_url && (
                                    <div
                                        className="absolute inset-x-0 bottom-0 p-3 bg-black/60 backdrop-blur-sm transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 z-30 flex items-center justify-center gap-3"
                                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on buttons
                                    >
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                const currentData = typeof page.text_layers === 'string'
                                                    ? JSON.parse(page.text_layers) || {}
                                                    : page.text_layers || {}

                                                await useBookStore.getState().updatePage(page.id, {
                                                    text_layers: { ...currentData, imageFit: 'contain' },
                                                    image_fit: 'contain'
                                                })
                                                await useBookStore.getState().savePageChanges(page.id, {
                                                    text_layers: { ...currentData, imageFit: 'contain' },
                                                    image_fit: 'contain'
                                                })
                                            }}
                                            className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition-all hover:scale-110 border border-white/10"
                                            title="크기에 맞게"
                                        >
                                            <Minimize className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                const currentData = typeof page.text_layers === 'string'
                                                    ? JSON.parse(page.text_layers) || {}
                                                    : page.text_layers || {}

                                                await useBookStore.getState().updatePage(page.id, {
                                                    text_layers: { ...currentData, imageFit: 'cover' },
                                                    image_fit: 'cover'
                                                })
                                                await useBookStore.getState().savePageChanges(page.id, {
                                                    text_layers: { ...currentData, imageFit: 'cover' },
                                                    image_fit: 'cover'
                                                })
                                            }}
                                            className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition-all hover:scale-110 border border-white/10"
                                            title="꽉 차게"
                                        >
                                            <Maximize className="w-4 h-4" />
                                        </button>

                                        <div className="w-px h-4 bg-white/20 mx-1" />

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                const input = document.createElement('input')
                                                input.type = 'file'
                                                input.accept = 'image/*'
                                                input.onchange = async (ev) => {
                                                    const file = (ev.target as HTMLInputElement).files?.[0]
                                                    if (!file) return

                                                    try {
                                                        const { uploadMedia } = await import('../services/storageService')
                                                        const { optimizeImage } = await import('../services/imageOptimizer')

                                                        const optimizedFile = await optimizeImage(file)
                                                        await import('../lib/supabase').then(m => m.supabase.auth.getUser())

                                                        const publicUrl = await uploadMedia(optimizedFile)

                                                        if (publicUrl) {
                                                            await useBookStore.getState().savePageChanges(page.id, { media_url: publicUrl })
                                                        }
                                                    } catch (error) {
                                                        console.error('Failed to change image:', error)
                                                        alert('이미지 변경 중 오류가 발생했습니다.')
                                                    }
                                                }
                                                input.click()
                                            }}
                                            className="p-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/80 transition-all hover:scale-110 shadow-lg border border-indigo-400"
                                            title="이미지 변경"
                                        >
                                            <ImagePlus className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Delete Action */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button
                                        onClick={(e) => handleDeleteClick(e, page.id)}
                                        className="p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-transform hover:scale-105 active:scale-95"
                                        title="페이지 삭제"
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!pageToDelete}
                onClose={() => setPageToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="페이지 삭제"
                message="정말 이 페이지를 삭제하시겠습니까? 이 작업은 복구할 수 없습니다."
                confirmText="삭제하기"
                isDangerous={true}
            />
        </div>
    )
}
