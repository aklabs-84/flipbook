import { useEffect, useState } from 'react'
import { useUIStore } from '../store/uiStore'

export const MOBILE_BREAKPOINT = 768

export const useIsMobile = (breakpoint: number = MOBILE_BREAKPOINT) => {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth < breakpoint
    )

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < breakpoint)
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [breakpoint])

    return isMobile
}

interface ResponsiveBookOptions {
    // Extra vertical space (px) to reserve on mobile for an overlaying header,
    // so the centered book never sits underneath it.
    mobileHeaderOffset?: number
}

export const useResponsiveBook = (options: ResponsiveBookOptions = {}) => {
    const { setScale } = useUIStore()
    const { mobileHeaderOffset = 0 } = options

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            const height = window.innerHeight
            const isMobile = width < MOBILE_BREAKPOINT

            if (isMobile) {
                // Mobile: fit a single page (not a two-page spread) so the
                // book fills the narrow, tall viewport instead of shrinking
                // into a small letterboxed strip.
                const bookWidth = 650
                const bookHeight = 850

                const sidePadding = 24
                const verticalPadding = 24

                const availableWidth = width - sidePadding
                const availableHeight = height - verticalPadding - mobileHeaderOffset

                const scaleX = availableWidth / bookWidth
                const scaleY = availableHeight / bookHeight

                const scale = Math.min(scaleX, scaleY, 1.6)
                setScale(scale)
            } else {
                // Desktop / tablet: fit the full two-page spread
                const bookWidth = 1300
                const bookHeight = 850
                const padding = 40

                const availableWidth = width - padding
                const availableHeight = height - padding

                const scaleX = availableWidth / bookWidth
                const scaleY = availableHeight / bookHeight

                const scale = Math.min(scaleX, scaleY, 1.1)
                setScale(scale)
            }
        }

        // Initial calc
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [setScale, mobileHeaderOffset])
}
