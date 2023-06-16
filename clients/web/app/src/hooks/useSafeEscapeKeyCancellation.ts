import { useEffect } from 'react'

function isSafeToClose(tagName: string) {
    return tagName !== 'INPUT' && tagName !== 'TEXTAREA'
}

export const useSafeEscapeKeyCancellation = (props: {
    onEscape?: () => void
    capture: boolean
}) => {
    const { onEscape, capture } = props
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.key === 'Escape' &&
                event.target instanceof HTMLElement &&
                isSafeToClose(event.target.tagName)
            ) {
                onEscape?.()
                event.stopPropagation()
            }
        }
        window.addEventListener('keydown', handleKeyDown, { capture: capture })
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: capture })
        }
    }, [onEscape, capture])
}
