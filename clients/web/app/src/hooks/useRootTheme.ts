import { useCallback, useEffect, useLayoutEffect } from 'react'
import { useStore } from 'store/store'
import { atoms } from 'ui/styles/atoms.css'
import { darkTheme, globalPreventTransitions, lightTheme } from 'ui/styles/vars.css'

type ThemeSettings = {
    ammendHTMLBody: boolean
    useDefaultOSTheme: boolean
}

export const useRootTheme = (settings: ThemeSettings) => {
    const { theme, setTheme } = useStore((state) => ({
        theme: state.theme,
        setTheme: state.setTheme,
    }))

    const { ammendHTMLBody = false, useDefaultOSTheme = false } = settings

    useEffect(() => {
        if (typeof theme === 'undefined') {
            const defaultDark =
                !useDefaultOSTheme || !window.matchMedia('(prefers-color-scheme: light)').matches

            setTheme(defaultDark ? 'dark' : 'light')
        }
    }, [setTheme, theme, useDefaultOSTheme])

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'light' ? 'dark' : 'light')
    }, [setTheme, theme])

    const themeClass = theme === 'light' ? lightTheme : darkTheme

    useLayoutEffect(() => {
        if (!ammendHTMLBody) {
            return
        }
        document.body.classList.add(
            globalPreventTransitions,
            themeClass,
            atoms({ color: 'default' }),
            atoms({ background: 'default' }),
        )
        const timeout = setTimeout(() => {
            document.body.classList.remove(globalPreventTransitions)
        }, 0)
        return () => {
            clearTimeout(timeout)
            document.body.classList.remove(
                globalPreventTransitions,
                themeClass,
                atoms({ color: 'default' }),
                atoms({ background: 'default' }),
            )
        }
    }, [ammendHTMLBody, themeClass])

    return { toggleTheme, theme }
}
