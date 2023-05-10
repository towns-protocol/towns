import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import { throttle } from 'lodash'
import { useZLayerContext } from '@ui'

/**
 * similar to https://github.com/mjsarfatti/use-mouse-leave but taking into
 * account child elements and modal container
 */
export const useHover = (ref: MutableRefObject<HTMLDivElement | null>, isEnabled = true) => {
    const [isHoverEvent, setIsHoverEvent] = useState(false)
    const [isHoverVerified, setIsHoverVerified] = useState(false)

    const onMouseEnter = useCallback(() => {
        setIsHoverEvent(true)
    }, [])

    const { rootLayerRef } = useZLayerContext()
    const prevRef = useRef({ clientX: 0, clientY: 0 })

    useEffect(() => {
        // first check, if the event hasn't been triggered there's no need to go further
        if (!isHoverEvent || !isEnabled) {
            return
        }

        // once the event has been triggered we await a mouse-move then check if
        // the container element is hovered
        const onMouseMove = throttle(
            (e: MouseEvent) => {
                const { clientX, clientY } = e ?? prevRef.current
                prevRef.current.clientX = clientX
                prevRef.current.clientY = clientY
                const el = document.elementFromPoint(clientX, clientY)
                if (!ref.current?.contains(el) && !rootLayerRef?.current?.contains(el)) {
                    setIsHoverEvent(false)
                } else {
                    setIsHoverVerified(true)
                }
            },
            50,
            {
                leading: false,
                trailing: true,
            },
        )

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('click', onMouseMove)

        const interval = setInterval(onMouseMove, 100)

        return () => {
            clearInterval(interval)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('click', onMouseMove)
        }
    }, [isHoverVerified, isHoverEvent, ref, rootLayerRef, isEnabled])

    useEffect(() => {
        if (!isHoverEvent) {
            setIsHoverVerified(false)
        }
    }, [isHoverEvent])

    useEffect(() => {
        if (!isHoverVerified) {
            setIsHoverEvent(false)
        }
    }, [isHoverVerified])

    return { isHover: isHoverVerified, onMouseEnter }
}
