import { useEffect, useRef, useState } from 'react'

export function useClickedOrFocusedOutside(
    containerRef: React.RefObject<HTMLElement>,
    {
        onOutside,
    }: {
        onOutside?: () => void
    },
) {
    const [isOutsideContainer, setIsOutsideContainer] = useState(false)
    const _onOutside = useRef(onOutside)

    useEffect(() => {
        function handleEvent(event: FocusEvent | MouseEvent) {
            if (containerRef.current?.contains(event.target as Node | null)) {
                setIsOutsideContainer(false)
            } else {
                setIsOutsideContainer(true)
                _onOutside.current?.()
            }
        }

        document.addEventListener('focus', handleEvent, true)
        document.addEventListener('click', handleEvent, true)

        return () => {
            document.removeEventListener('focus', handleEvent, true)
            document.removeEventListener('click', handleEvent, true)
        }
    }, [containerRef])

    return isOutsideContainer
}
