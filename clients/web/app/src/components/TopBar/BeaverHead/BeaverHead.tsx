import React, { useEffect, useRef } from 'react'
import { Box } from '@ui'
import { SECOND_MS } from 'data/constants'
import beaver from './assets/beaver16x.png'
import beaverBlink from './assets/beaver16x-blink.png'

type Props = {
    isActive: boolean
}

export const BeaverHead = (props: Props) => {
    const { isActive } = props
    const { imageRef } = useBlink(isActive)

    return (
        <Box
            ref={imageRef}
            as="img"
            src={isActive ? beaver : beaverBlink}
            alt="Towns Points"
            height="x2"
        />
    )
}

const useBlink = (isActive: boolean) => {
    const imageRef = useRef<HTMLImageElement>(null)
    useEffect(() => {
        if (!isActive) {
            return
        }
        let timeout: NodeJS.Timeout
        let raf: number
        const blink = () => {
            if (imageRef.current) {
                imageRef.current.src = beaverBlink
            }
            timeout = setTimeout(() => {
                if (imageRef.current) {
                    imageRef.current.src = beaver
                }
                timeout = setTimeout(rafBlink, SECOND_MS * (0.5 + Math.random() * 5))
            }, 100)
        }

        const rafBlink = () => {
            raf = requestAnimationFrame(blink)
        }

        rafBlink()

        return () => {
            clearTimeout(timeout)
            cancelAnimationFrame(raf)
        }
    }, [isActive])

    return { imageRef }
}
