import { MutableRefObject, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { throttle } from 'throttle-debounce'
import { RootLayerContext } from '@ui'

/**
 * similar to https://github.com/mjsarfatti/use-mouse-leave but taking into
 * account child elements and modal container
 */
export const useHover = (ref: MutableRefObject<HTMLDivElement | null>) => {
    const [isHover, setIsHover] = useState(false)

    const onMouseEnter = useCallback(() => {
        setIsHover(true)
    }, [])

    const { rootLayerRef } = useContext(RootLayerContext)
    const prevRef = useRef({ clientX: 0, clientY: 0 })

    useEffect(() => {
        if (!isHover) {
            return
        }

        const onMouseMove = throttle(50, (e: MouseEvent) => {
            const { clientX, clientY } = e ?? prevRef.current
            prevRef.current.clientX = clientX
            prevRef.current.clientY = clientY
            const el = document.elementFromPoint(clientX, clientY)
            if (!ref.current?.contains(el) && !rootLayerRef?.current?.contains(el)) {
                setIsHover(false)
            }
        })

        const onBlur = () => {
            setIsHover(false)
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('click', onMouseMove)
        window.addEventListener('blur', onBlur)

        const interval = setInterval(onMouseMove, 100)

        return () => {
            clearInterval(interval)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('click', onMouseMove)
            window.removeEventListener('blur', onBlur)
        }
    }, [isHover, ref, rootLayerRef])

    return { isHover, onMouseEnter }
}
