import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

export const useResponsiveBook = () => {
    const { setScale } = useUIStore()

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            const height = window.innerHeight

            // Base Book Size
            const bookWidth = 1300
            const bookHeight = 850

            // Margin / Padding
            const padding = 40

            const availableWidth = width - padding
            const availableHeight = height - padding

            // Calculate scale to fit
            const scaleX = availableWidth / bookWidth
            const scaleY = availableHeight / bookHeight

            // Use smallest scale to ensure it fits entirely, but cap at 1.0 (or 1.2 if desired)
            const scale = Math.min(scaleX, scaleY, 1.1)

            setScale(scale)
        }

        // Initial calc
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [setScale])
}
