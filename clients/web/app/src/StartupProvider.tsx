import React, { ReactNode, createContext, useContext, useState } from 'react'

interface StartupContextProps {
    appStartTime: number
    resetStartupTime: VoidFunction
}

const StartupContext = createContext<StartupContextProps | undefined>(undefined)

// Custom hook for consuming the context
export function useStartupTime(): [number, VoidFunction] {
    const context = useContext(StartupContext)

    if (!context) {
        // Handle the case where the context is used outside the provider
        return [performance.now(), () => {}] // Return default time and noop reset
    }

    return [context.appStartTime, context.resetStartupTime]
}

// Provider component to wrap the app
export function StartupProvider({ children }: { children: ReactNode }): JSX.Element {
    const [appStartTime, setAppStartTime] = useState<number>(performance.now())

    console.log('[app startup] appStartTime', appStartTime)

    // Function to reset the app start time
    const resetStartupTime: VoidFunction = () => {
        const startTime = performance.now()
        setAppStartTime(startTime)
        console.log('[app startup] appStartTime', startTime)
    }

    return (
        <StartupContext.Provider value={{ appStartTime, resetStartupTime }}>
            {children}
        </StartupContext.Provider>
    )
}
