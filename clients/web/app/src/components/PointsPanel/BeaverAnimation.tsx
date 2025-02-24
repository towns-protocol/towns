import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRiverPointsCheckIn } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { Box } from '@ui'
import { DAY_MS, SECOND_MS } from 'data/constants'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { Figma } from 'ui/styles/palette'
import { useStore } from 'store/store'
import { FadeInBox } from '@components/Transitions'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { SpriteSequencer } from './SpriteSequencer'
import spriteSheet from './assets/sprites-combined_64.png'
import spriteSheetData from './assets/sprites-combined.json'
import fingerImage from './assets/finger.png'
import { Coin, CoinData } from './Coin'
import { PixelProgress } from './PixelProgress'
import { RubBellyPill } from './RubBellyPill'

const MAX_WIDTH = 400

type Props = {
    isActive: boolean
    isSubmitting: boolean
    isPointsSuccess: boolean
    onBellyRub: () => Promise<boolean | undefined>
    points: number | undefined
    abstractAccountAddress: `0x${string}` | undefined
    lastCheckIn: number | undefined
}

export const BeaverAnimation = (props: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const { coins, removeCoin } = useCoinsAnimation(props.points, props.isPointsSuccess)

    const [isActive, setActive] = useState(props.isActive)
    useBeaverAnimations(canvasRef, isActive)

    useEffect(() => {
        setActive(props.isActive)
    }, [props.isActive])

    useRiverPointsCheckIn(props.abstractAccountAddress, {
        onError: (error) => {
            setActive(props.isActive)
        },
    })

    const onClick = async () => {
        setActive(false)

        const result = await props.onBellyRub()

        if (!result) {
            setActive(true)
            return
        }
    }

    const { getTheme } = useStore()

    const containerStyle = useMemo(() => {
        return getTheme() === 'dark'
            ? {
                  background: `linear-gradient(to bottom, ${Figma.DarkMode.Level1}, ${Figma.DarkMode.Level1} 40%, ${Figma.DarkMode.Level2} 100%)`,
              }
            : {
                  background: `linear-gradient(to bottom, ${Figma.LightMode.Level1}, ${Figma.LightMode.Level2} 40%, ${Figma.LightMode.Level2} 100%)`,
              }
    }, [getTheme])

    return (
        <Box centerContent position="absoluteFill" width="100%" style={containerStyle}>
            <canvas
                ref={canvasRef}
                width={125}
                height={125}
                style={contentStyle}
                onPointerDown={isActive ? onClick : undefined}
            />
            <AnimatePresence>
                <Box centerContent style={contentStyle}>
                    {props.isSubmitting && (
                        <FadeInBox key="progress" preset="fadeup">
                            <PixelProgress />
                        </FadeInBox>
                    )}
                    <HoverBox
                        isActive={isActive}
                        lastCheckIn={props.lastCheckIn}
                        onClick={onClick}
                    />
                </Box>
            </AnimatePresence>

            <Box absoluteFill zIndex="above" pointerEvents="none">
                {coins.map((coin) => (
                    <Coin key={coin.key} data={coin} onComplete={removeCoin} />
                ))}
            </Box>
        </Box>
    )
}

const HoverBox = (props: {
    isActive: boolean
    lastCheckIn: number | undefined
    onClick: () => void
}) => {
    const { isActive } = props
    const ref = useRef<HTMLDivElement>(null)
    const labelRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!ref.current || !labelRef.current || !isActive) {
            return
        }

        let dx = 0,
            dy = 0
        let x = 0,
            y = 0
        let da = 0,
            o = 0

        const onMouseLeave = () => {
            da = 0
        }

        const onMouseMove = (e: MouseEvent) => {
            const label = labelRef.current
            if (!label) {
                return
            }
            if (!ref.current) {
                return
            }

            const bounds = ref.current.getBoundingClientRect()

            dx = e.clientX - bounds.left
            dy = e.clientY - bounds.top
            da = 1
        }

        let raf: number
        const animate = () => {
            raf = requestAnimationFrame(animate)
            if (labelRef.current) {
                x += (dx - x) * 0.1
                y += (dy - y) * 0.05
                o += (da - o) * 0.1

                const intensity = Math.ceil(Math.max(0, Math.sin(Date.now() * 0.005)))
                const i1 = Math.max(0, Math.sin(Date.now() * 0.005))
                const i2 = Math.max(0, Math.sin(Date.now() * 0.008))
                const ax = 0 + 3 * Math.cos(Date.now() * 0.02) * intensity * i1
                const ay = 0 + 2 * Math.sin(Date.now() * 2 * 0.01) * intensity * i2

                labelRef.current.style.transform = `translate(${x + ax}px, ${y + ay}px) scale(1.5) `
                labelRef.current.style.opacity = `${o}`
            }
        }

        raf = requestAnimationFrame(animate)

        const container = ref.current
        container.addEventListener('mousemove', onMouseMove)
        container.addEventListener('mouseleave', onMouseLeave)

        return () => {
            cancelAnimationFrame(raf)
            container.removeEventListener('mousemove', onMouseMove)
            container.removeEventListener('mouseleave', onMouseLeave)
        }
    }, [ref, labelRef, isActive])

    const onClick = useCallback(() => {
        if (!isActive) {
            const remaining = props.lastCheckIn
                ? new Date(DAY_MS + props.lastCheckIn - Date.now())
                : 0
            const remainingHours = remaining ? remaining.getUTCHours() : 0
            const remainingMinutes = remaining ? remaining.getUTCMinutes() : 0

            popupToast(({ toast }) => (
                <StandardToast.Success
                    icon="beaver"
                    message="The beaver is not ready for his belly rub."
                    subMessage={`Come back in ${
                        !remaining
                            ? 'a bit'
                            : remainingHours > 0
                            ? `${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`
                            : `${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`
                    }.`}
                    toast={toast}
                />
            ))
            return
        }
        props.onClick()
    }, [props, isActive])

    return (
        <Box centerContent style={cursorStyle} ref={ref} onMouseDown={onClick}>
            {isActive && <RubBellyPill ref={labelRef} />}
        </Box>
    )
}

const useBeaverAnimations = (canvasRef: React.RefObject<HTMLCanvasElement>, isActive: boolean) => {
    const [beaver] = useState(() => {
        return new SpriteSequencer(spriteSheet, spriteSheetData).play(isActive ? 'ready' : 'rest')
    })

    useEffect(() => {
        let timeout: NodeJS.Timeout
        let raf: number

        const animate = () => {
            beaver.tick()
            if (canvasRef.current) {
                beaver.draw(canvasRef.current)
            }
            timeout = setTimeout(nextTick, SECOND_MS / 12)
        }

        const nextTick = () => {
            raf = requestAnimationFrame(animate)
        }

        nextTick()

        return () => {
            clearTimeout(timeout)
            cancelAnimationFrame(raf)
        }
    }, [beaver, canvasRef])

    const setAnimationInactive = useCallback(() => {
        beaver
            .play('giggle-transition-in')
            .append('giggle')
            .append('giggle')
            .append('giggle')
            .append('rest-transition-in')
            .append('rest')
    }, [beaver])

    const setAnimationActive = useCallback(() => {
        if (beaver.currentLoop === 'ready') {
            return
        }
        if (beaver.currentLoop === 'giggle-transition-in') {
            beaver.clear().append('giggle').append('ready')
            return
        }
        if (beaver.currentLoop === 'giggle') {
            beaver.clear().append('giggle-transition-in').reverse().append('ready')
            return
        }
        beaver
            .append('rest-transition-in')
            .reverse()
            .append('giggle-transition-in')
            .reverse()
            .append('ready')
    }, [beaver])

    const isInitRef = useRef(false)

    useEffect(() => {
        if (!isInitRef.current) {
            isInitRef.current = true
            return
        }

        if (isActive) {
            setAnimationActive()
        } else {
            setAnimationInactive()
        }
    }, [isActive, setAnimationActive, setAnimationInactive])

    return { setAnimationInactive, restoreAnimationActive: setAnimationActive }
}

const useCoinsAnimation = (points: number | undefined, isPointsSuccess: boolean) => {
    const { containerWidth, containerHeight } = useSizeContext()
    const [coins, setCoins] = useState<CoinData[]>(() => [])
    const pointsRef = useRef(points)

    useEffect(() => {
        if (points === undefined) {
            return
        }

        if (pointsRef.current === undefined) {
            pointsRef.current = points
            return
        }

        const newPoints = points - pointsRef.current
        pointsRef.current = points
        if (isPointsSuccess && newPoints > 0 && newPoints <= 30) {
            setCoins(() => {
                return [
                    ...Array.from({ length: newPoints }).map((_, index, arr) => ({
                        delay: 0.5 * index * SECOND_MS,
                        pos: {
                            t: 0,
                            x: containerWidth / 2 - Math.min(MAX_WIDTH, containerWidth) * -0.05,
                            y: containerHeight / 2 - Math.min(MAX_WIDTH, containerWidth) * 0.35,
                        },
                        key: `coin_${Date.now() * 1000 + index}`,
                    })),
                ]
            })
        }
    }, [containerHeight, containerWidth, points, isPointsSuccess])

    const removeCoin = useCallback((coin: CoinData) => {
        setCoins((prev) => prev.filter((c) => c.key !== coin.key))
    }, [])

    return { coins, removeCoin }
}

const contentStyle: CSSProperties = {
    position: 'absolute',
    width: `min(${MAX_WIDTH}px, 100%)`,
    aspectRatio: '1/1',
    imageRendering: 'pixelated',
}

const cursorStyle: CSSProperties = {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: '35%',
    height: '30%',
    borderRadius: '100%',
    transform: 'translate(-50%, -50%)',
    cursor: `url(${fingerImage}), auto`,
}
