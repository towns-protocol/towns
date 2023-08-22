import React, { useContext, useEffect } from 'react'
import { useDevice } from 'hooks/useDevice'

const VisualViewportContext = React.createContext<{
    visualViewportScrolled: boolean
    offset?: number
    height?: number
}>({ visualViewportScrolled: false, offset: 0 })

export const useVisualViewportContext = () => {
    const context = useContext(VisualViewportContext)
    return context
}

const { visualViewport } = window

export const VisualViewportContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { isTouch } = useDevice()
    const [setIsKeyboardPresent, isKeyboardPresent] = React.useState(false)
    const [offset, setOffset] = React.useState(visualViewport?.pageTop)
    const [height, setHeight] = React.useState(visualViewport?.height)

    useEffect(() => {
        const onScroll = () => {
            isKeyboardPresent((visualViewport?.pageTop ?? 0) > 0)
            setOffset(visualViewport?.pageTop ?? 0)
        }
        visualViewport?.addEventListener('scroll', onScroll)
        return () => {
            visualViewport?.removeEventListener('scroll', onScroll)
        }
    }, [isKeyboardPresent])

    useEffect(() => {
        const onResize = () => {
            setHeight(visualViewport?.height)
        }
        visualViewport?.addEventListener('resize', onResize)
        return () => {
            visualViewport?.removeEventListener('resize', onResize)
        }
    }, [isKeyboardPresent])

    /**
     * dismiss keyboard when (fake) swiping down on iOS
     */
    useEffect(() => {
        const viewportHeight = visualViewport?.height

        if (!isTouch || !setIsKeyboardPresent || !viewportHeight) {
            return
        }

        const activeElement = document.activeElement as HTMLElement

        if (!activeElement) {
            return
        }

        const touchStart = (e: TouchEvent) => {
            window.addEventListener('touchmove', touchMove, { passive: true })
            window.addEventListener('touchend', touchEnd, { passive: true })
        }

        const touchMove = (e: TouchEvent) => {
            const y = e.touches[0].clientY
            if (y > viewportHeight) {
                if (activeElement) {
                    activeElement.blur()
                }
            }
        }
        const touchEnd = (e: TouchEvent) => {
            window.removeEventListener('touchmove', touchMove)
            window.removeEventListener('touchend', touchEnd)
        }

        window.addEventListener('touchstart', touchStart, { passive: true })

        return () => {
            window.removeEventListener('touchstart', touchStart)
            window.removeEventListener('touchmove', touchMove)
            window.removeEventListener('touchend', touchEnd)
        }
    }, [isTouch, setIsKeyboardPresent])

    return (
        <VisualViewportContext.Provider
            value={{ visualViewportScrolled: setIsKeyboardPresent, offset, height }}
        >
            {children}
        </VisualViewportContext.Provider>
    )
}
