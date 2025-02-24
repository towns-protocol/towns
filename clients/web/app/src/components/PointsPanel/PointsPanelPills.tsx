import React, { useEffect, useRef, useState } from 'react'
import { Box, BoxProps, Paragraph } from '@ui'
import { DAY_MS, SECOND_MS } from 'data/constants'
import { BeaverHead } from '@components/TopBar/BeaverHead/BeaverHead'

export const CountdownPill = (props: { lastCheckIn: number }) => {
    const { lastCheckIn = 0 } = props
    const [time, setTime] = useState(0)

    const isActive = lastCheckIn < Date.now() && lastCheckIn > Date.now() - DAY_MS

    useEffect(() => {
        if (isActive) {
            const interval = setInterval(() => {
                setTime(DAY_MS + lastCheckIn - Date.now())
            }, SECOND_MS)
            return () => clearInterval(interval)
        }
    }, [isActive, lastCheckIn])

    const date = new Date(time)

    const timeString = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
        .map((value) => value.toString().padStart(2, '0'))
        .join(':')

    if (!isActive || !lastCheckIn) {
        return null
    }

    return (
        <Pill tooltip="Time to next rub">
            <Paragraph size="sm">⏰</Paragraph>
            <Paragraph size="xs" style={{ fontFamily: 'monospace' }}>
                {timeString}
            </Paragraph>
        </Pill>
    )
}

export const RiverPointsPill = (props: {
    riverPoints?: number
    isActive: boolean
    isPointsSuccess: boolean
}) => {
    const { riverPoints, isActive, isPointsSuccess } = props
    const ref = useRef<HTMLDivElement>(null)
    const [points, setPoints] = useState(riverPoints)
    const pointsRef = useRef(points)
    useEffect(() => {
        if (riverPoints === undefined || pointsRef.current === undefined) {
            return
        }
        const oldPoints = pointsRef.current
        const newPoints = riverPoints - pointsRef.current
        pointsRef.current = riverPoints

        if (isPointsSuccess && newPoints > 0 && newPoints <= 30) {
            for (let i = 0; i < newPoints; i++) {
                setTimeout(() => {
                    const style = ref.current?.style
                    if (style) {
                        style.transition = 'none'
                        style.backgroundColor = '#fc9'
                        requestAnimationFrame(() => {
                            style.transition = 'background 0.2s ease-in-out'
                            style.backgroundColor = ''
                        })
                    }
                    setPoints(() => oldPoints + i + 1)
                }, (2 + i * 0.5) * SECOND_MS)
            }
        } else {
            setPoints(riverPoints)
        }
    }, [riverPoints, isPointsSuccess])
    return (
        <Pill ref={ref}>
            <BeaverHead isActive={isActive} />
            <Paragraph size="sm">{points}</Paragraph>
        </Pill>
    )
}

export const StreakPill = (props: { streak: number }) => {
    const { streak } = props
    const streakText = `${streak} ${streak <= 1 ? 'day' : 'days'}`
    return (
        <Pill tooltip={`Current streak: ${streakText}`}>
            <Paragraph size="sm">🔥</Paragraph>
            <Paragraph size="sm">{streakText}</Paragraph>
        </Pill>
    )
}

const Pill = React.forwardRef<HTMLDivElement, BoxProps>((props, ref) => {
    return (
        <Box
            hoverable
            horizontal
            centerContent
            ref={ref}
            cursor="default"
            gap="xs"
            rounded="sm"
            background="level2"
            padding="sm"
            paddingX="paragraph"
            {...props}
        />
    )
})
