

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isDangerous?: boolean
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    isDangerous = false
}: ConfirmationModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-6 flex flex-col gap-4"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{message}</p>

                <div className="flex gap-3 justify-end mt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium text-sm hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                        className={`px-4 py-2 text-white font-bold text-sm rounded-lg shadow-sm transition-colors ${isDangerous
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-brand-purple hover:bg-indigo-600'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
