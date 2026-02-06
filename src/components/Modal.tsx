import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    actions?: React.ReactNode
    type?: 'default' | 'danger' | 'success'
}

export default function Modal({ isOpen, onClose, title, children, actions, type = 'default' }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    if (!isOpen) return null

    // Portal to body to ensure it sits on top of everything
    const content = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${type === 'danger' ? 'bg-red-50' :
                        type === 'success' ? 'bg-green-50' : 'bg-white'
                    }`}>
                    <h3 className={`font-bold text-lg ${type === 'danger' ? 'text-red-700' :
                            type === 'success' ? 'text-green-700' : 'text-gray-900'
                        }`}>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-black/5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 text-gray-600 leading-relaxed">
                    {children}
                </div>

                {/* Footer / Actions */}
                {actions && (
                    <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )

    return createPortal(content, document.body)
}
