import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { FadeInBox } from '@components/Transitions'
import { Paragraph } from '@ui'
import { SECOND_MS } from 'data/constants'

export const RotatingText = ({ texts }: { texts: string[] }) => {
    const currentText = useTextCycle(texts)

    return (
        <AnimatePresence mode="wait">
            <FadeInBox key={currentText}>
                <Paragraph color="gray2">{currentText ?? ' . '}</Paragraph>
            </FadeInBox>
        </AnimatePresence>
    )
}

const useTextCycle = (texts: string[]) => {
    const [textIndex, setTextIndex] = useState(-1)
    const [isStarted, setIsStarted] = useState(false)

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsStarted(true)
        }, SECOND_MS * 1)

        return () => {
            clearTimeout(timeout)
        }
    }, [textIndex])

    useEffect(() => {
        if (!isStarted) {
            return
        }
        let timeout: NodeJS.Timeout, raf: number
        const update = () => {
            setTextIndex((textIndex) => (textIndex + 1) % texts.length)
            timeout = setTimeout(() => {
                raf = window.requestAnimationFrame(update)
            }, 4000)
        }
        update()

        return () => {
            clearTimeout(timeout)
            cancelAnimationFrame(raf)
        }
    }, [isStarted, texts.length])

    return texts[textIndex]
}
