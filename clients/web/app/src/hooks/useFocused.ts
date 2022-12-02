import { MutableRefObject, useEffect, useState } from 'react'

export const useFocused = (ref: MutableRefObject<HTMLDivElement | null>) => {
    const [isFocused, setIsFocused] = useState(false)
    const el = ref.current

    useEffect(() => {
        if (!el) {
            return
        }
        const onFocus = () => {
            setIsFocused(true)
        }
        const onOtherFocus = (e: FocusEvent) => {
            if (!(e.target instanceof Node) || !el.contains(e.target)) {
                setIsFocused(false)
            }
        }

        el.addEventListener('focus', onFocus)
        window.addEventListener('focus', onOtherFocus, true)
        window.addEventListener('click', onOtherFocus)

        return () => {
            el.removeEventListener('focus', onFocus)
            window.removeEventListener('focus', onOtherFocus, true)
            window.removeEventListener('click', onOtherFocus)
        }
    }, [el])

    return { isFocused }
}
