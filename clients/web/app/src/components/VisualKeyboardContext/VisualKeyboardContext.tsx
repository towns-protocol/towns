import React, { useContext, useEffect } from 'react'

const VisualKeyboardContext = React.createContext<
    | {
          visualKeyboardPresent: boolean
      }
    | undefined
>(undefined)

export const useVisualKeyboardContext = () => {
    const context = useContext(VisualKeyboardContext)
    if (!context) {
        throw new Error(
            'useVisualKeyboardContext must be used within a VisualKeyboardContextProvider',
        )
    }
    return context
}

export const VisualKeyboardContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [tabBarHidden, setTabBarHidden] = React.useState(false)

    useEffect(() => {
        const onScroll = () => {
            setTabBarHidden((window.visualViewport?.pageTop ?? 0) > 0)
        }
        window.visualViewport?.addEventListener('scroll', onScroll)
        return () => {
            window.visualViewport?.removeEventListener('scroll', onScroll)
        }
    }, [setTabBarHidden])

    return (
        <VisualKeyboardContext.Provider value={{ visualKeyboardPresent: tabBarHidden }}>
            {children}
        </VisualKeyboardContext.Provider>
    )
}
