import { useState, useEffect } from 'react'

interface LazyImageProps {
    src: string
    alt: string
    className?: string
    shouldLoad: boolean
    fit?: 'cover' | 'contain'
}

export default function LazyImage({ src, alt, className, shouldLoad, fit = 'cover' }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        if (shouldLoad && src) {
            const img = new Image()
            img.src = src
            img.onload = () => setIsLoaded(true)
            img.onerror = () => setHasError(true)
        }
    }, [shouldLoad, src])

    return (
        <div className={`relative w-full h-full overflow-hidden bg-gray-50 flex items-center justify-center ${className}`}>
            {/* 1. Loading Spinner */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-purple rounded-full animate-spin"></div>
                </div>
            )}

            {/* 2. Error Placeholder */}
            {hasError && (
                <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="text-xs">이미지를 불러올 수 없습니다</span>
                </div>
            )}

            {/* 3. Actual Image */}
            {(shouldLoad || isLoaded) && (
                <img
                    src={src}
                    alt={alt}
                    className={`transition-opacity duration-500 w-full h-full
                        ${fit === 'contain' ? 'object-contain p-4' : 'object-cover'}
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    `}
                    loading="lazy" // Native lazy loading as backup
                />
            )}
        </div>
    )
}
