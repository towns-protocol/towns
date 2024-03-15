import { useLayoutEffect } from 'react'
import { useStore } from 'store/store'
import { atoms } from 'ui/styles/atoms.css'
import { darkTheme, globalPreventTransitions, lightTheme } from 'ui/styles/vars.css'

type ThemeSettings = {
    ammendHTMLBody: boolean
    useDefaultOSTheme: boolean
}

export const useRootTheme = (settings: ThemeSettings) => {
    const { theme, toggleTheme, setSystemTheme } = useStore((state) => ({
        theme: state.getTheme(),
        userTheme: state.userTheme,
        setUserTheme: state.setUserTheme,
        setSystemTheme: state.setSystemTheme,
        toggleTheme: state.toggleTheme,
    }))

    const { ammendHTMLBody = false, useDefaultOSTheme = false } = settings

    useLayoutEffect(() => {
        const defaultDark =
            !useDefaultOSTheme || !window.matchMedia('(prefers-color-scheme: light)').matches

        setSystemTheme(defaultDark ? 'dark' : 'light')

        if (useDefaultOSTheme) {
            const onChange = ({ matches }: MediaQueryListEvent) => {
                setSystemTheme(matches ? 'light' : 'dark')
            }

            const matchMedia = window.matchMedia('(prefers-color-scheme: light)')
            matchMedia.addEventListener('change', onChange)

            return () => {
                matchMedia.removeEventListener('change', onChange)
            }
        }
    }, [setSystemTheme, theme, useDefaultOSTheme])

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

    return { theme, toggleTheme }
}
