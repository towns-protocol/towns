import React, { useContext, useEffect } from 'react'
import { useDevice } from 'hooks/useDevice'

const VisualViewportContext = React.createContext<{
    visualViewportScrolled: boolean
    offset?: number
    height?: number
    visible: boolean
}>({
    visualViewportScrolled: false,
    offset: 0,
    visible: false,
})

export const useVisualViewportContext = () => {
    const context = useContext(VisualViewportContext)
    return context
}

const { visualViewport } = window

export const VisualViewportContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { isTouch } = useDevice()
    const [visible, setVisible] = React.useState(document.visibilityState === 'visible')
    const [isViewportScrolled, setIsViewportScrolled] = React.useState(false)
    const [offset, setOffset] = React.useState(visualViewport?.pageTop)
    const [height, setHeight] = React.useState(visualViewport?.height)

    useEffect(() => {
        const onScroll = () => {
            setIsViewportScrolled((visualViewport?.pageTop ?? 0) > 0)
            setOffset(visualViewport?.pageTop ?? 0)
        }
        visualViewport?.addEventListener('scroll', onScroll)
        return () => {
            visualViewport?.removeEventListener('scroll', onScroll)
        }
    }, [setIsViewportScrolled])

    useEffect(() => {
        const onVisibilityChange = () => {
            const activeElement = document.activeElement as HTMLElement
            const v = document.visibilityState === 'visible'
            setVisible(v)
            if (v && !activeElement) {
                // clean up state when coming back from background
                setIsViewportScrolled(false)
                setOffset(0)
                setHeight(visualViewport?.height)
                const root = document.querySelector('html')
                if (root) {
                    // when coming back from background on iOS, page is scrolled
                    // down. not sure if this is a browser bug or not, but this fixes it.
                    root.scrollTo(0, 0)
                }
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [])

    useEffect(() => {
        const onResize = () => {
            setHeight(visualViewport?.height)
        }
        visualViewport?.addEventListener('resize', onResize)
        return () => {
            visualViewport?.removeEventListener('resize', onResize)
        }
    }, [setIsViewportScrolled])

    /**
     * dismiss keyboard when (fake) swiping down on iOS
     */
    useEffect(() => {
        const viewportHeight = visualViewport?.height

        if (!isTouch || !isViewportScrolled || !viewportHeight) {
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
    }, [isTouch, isViewportScrolled])

    return (
        <VisualViewportContext.Provider
            value={{ visualViewportScrolled: isViewportScrolled, offset, height, visible }}
        >
            {children}
        </VisualViewportContext.Provider>
    )
}
