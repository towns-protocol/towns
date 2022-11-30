import { useEffect } from 'react'
import { useStore } from 'store/store'

export const useWindowListener = () => {
    const { isWindowFocused, setIsWindowFocused } = useStore(
        ({ isWindowFocused, setIsWindowFocused }) => ({
            isWindowFocused,
            setIsWindowFocused,
        }),
    )

    useEffect(() => {
        const onBlur = () => {
            setIsWindowFocused(false)
        }
        const onfocus = () => {
            setIsWindowFocused(true)
        }

        window.addEventListener('blur', onBlur)
        window.addEventListener('focus', onfocus)

        return () => {
            window.removeEventListener('blur', onBlur)
            window.removeEventListener('focus', onfocus)
        }
    }, [setIsWindowFocused])

    return { isActiveWindow: isWindowFocused }
}
