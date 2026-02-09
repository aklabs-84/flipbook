import React, { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

interface TitleInputModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (title: string) => void
    initialTitle: string
    title: string // Modal Header Title
}

export default function TitleInputModal({ isOpen, onClose, onConfirm, initialTitle, title }: TitleInputModalProps) {
    const [value, setValue] = useState(initialTitle)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setValue(initialTitle)
            // Focus input after a short delay to allow modal animation
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 100)
        }
    }, [isOpen, initialTitle])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (value.trim()) {
            onConfirm(value.trim())
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            actions={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors font-medium text-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!value.trim()}
                        className="px-6 py-2 bg-brand-purple text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
                    >
                        확인
                    </button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="프로젝트 이름을 입력하세요"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 transition-all outline-none text-base font-medium text-gray-800 placeholder:text-gray-400"
                        autoFocus
                    />
                </div>
            </form>
        </Modal>
    )
}
