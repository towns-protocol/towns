import { useTimelineStore } from 'use-zion-client'
import { useEffect, useState } from 'react'
import { MINUTE_MS } from 'data/constants'

const GREEN_TIME = MINUTE_MS * 15

const getGreen = (ms: number) => Date.now() - ms < GREEN_TIME

export const useGreenDot = (userId: string | undefined) => {
    const lastEventMs = useTimelineStore((state) => {
        return userId ? state.lastestEventByUser[userId]?.createdAtEpocMs ?? 0 : 0
    })

    const [isGreen, setIsGreen] = useState(getGreen(lastEventMs))

    useEffect(() => {
        const isGreen = getGreen(lastEventMs)
        setIsGreen(isGreen)
        if (isGreen) {
            const timeout = setTimeout(() => {
                setIsGreen(getGreen(lastEventMs))
            }, GREEN_TIME - (Date.now() - lastEventMs))
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [lastEventMs])

    return isGreen
}
