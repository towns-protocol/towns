import React, { useContext, useEffect } from 'react'

const VisualKeyboardContext = React.createContext<{
    visualViewportScrolled: boolean
    offset?: number
    height?: number
}>({ visualViewportScrolled: false, offset: 0 })

export const useVisualViewportContext = () => {
    const context = useContext(VisualKeyboardContext)
    return context
}

const { visualViewport } = window

export const VisualViewportContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [tabBarHidden, setTabBarHidden] = React.useState(false)
    const [offset, setOffset] = React.useState(visualViewport?.pageTop)
    const [height, setHeight] = React.useState(visualViewport?.height)

    useEffect(() => {
        const onScroll = () => {
            setTabBarHidden((visualViewport?.pageTop ?? 0) > 0)
            setOffset(visualViewport?.pageTop ?? 0)
        }
        visualViewport?.addEventListener('scroll', onScroll)
        return () => {
            visualViewport?.removeEventListener('scroll', onScroll)
        }
    }, [setTabBarHidden])

    useEffect(() => {
        const onResize = () => {
            setHeight(visualViewport?.height)
        }
        visualViewport?.addEventListener('resize', onResize)
        return () => {
            visualViewport?.removeEventListener('resize', onResize)
        }
    }, [setTabBarHidden])

    return (
        <VisualKeyboardContext.Provider
            value={{ visualViewportScrolled: tabBarHidden, offset, height }}
        >
            {children}
        </VisualKeyboardContext.Provider>
    )
}
