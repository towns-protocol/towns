import { useEffect } from 'react'
import { QUERY_PARAMS } from 'routes'

function isSafeToClose(tagName: string) {
    return tagName !== 'INPUT' && tagName !== 'TEXTAREA'
}

function isImageViewerOpen() {
    const searchParams = new URLSearchParams(window.location.search)
    return searchParams.has(QUERY_PARAMS.GALLERY_ID)
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
                isSafeToClose(event.target.tagName) &&
                !isImageViewerOpen()
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
