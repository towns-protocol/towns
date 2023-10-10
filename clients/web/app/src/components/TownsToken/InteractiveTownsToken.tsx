import { Target, TargetAndTransition, Transition, motion } from 'framer-motion'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { TownsToken, TownsTokenProps } from './TownsToken'
import { TownsTokenConfig } from './TownsTokenConfig'

type Props = TownsTokenProps & {
    onAnimationComplete?: () => void
    mintMode?: boolean
    imageSrc?: string
    imageSrcRenderKey?: string
}

export const InteractiveTownsToken = (props: Props) => {
    const { address, onAnimationComplete } = props
    const config = TownsTokenConfig.sizes[props.size]

    const [{ x, y, a }, setInput] = useState({ x: 0, y: 0, a: 0 })

    const ref = useRef<HTMLDivElement>(null)

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        const bounds = ref.current?.getBoundingClientRect()
        if (bounds) {
            const x = ((e.clientX - bounds.left) / bounds.width - 0.5) * 1.33
            const y = ((e.clientY - bounds.top) / bounds.height - 0.5) * 1.33
            const a = Math.atan2(y, x)
            setInput({ x, y, a })
        }
    }, [])

    const [isOut, setIsOut] = useState(true)

    const [isInteracting, setIsInteracting] = useState(false)
    useEffect(() => {
        if (isOut) {
            setIsInteracting(false)
        } else {
            const timeout = setTimeout(() => {
                setIsInteracting(true)
            }, 350)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isOut])

    const onMouseEnter = useCallback(() => {
        setIsOut(false)
    }, [])

    const onMouseLeave = useCallback(() => {
        setIsOut(true)
    }, [])

    const distance = Math.sqrt(x * x + y * y)
    const isMint = !!address && props.mintMode
    const mint = isMint ? 0 : 1

    const [isInit, setIsInit] = useState(false)
    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsInit(true)
        }, 100)
        return () => {
            clearTimeout(timeout)
        }
    })

    const transition: Transition = useMemo(
        () =>
            !isInit
                ? {
                      type: 'spring',
                      stiffness: 50,
                      damping: 5,
                  }
                : isMint
                ? {
                      type: 'tween',
                      ease: [1, 0.01, 0.52, 2],
                      duration: 0.5,
                      delay: 1,
                  }
                : isOut
                ? {
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                      restSpeed: 0.01,
                  }
                : !isInteracting
                ? {
                      type: 'spring',
                      stiffness: 800,
                      damping: 80,
                      restSpeed: 0.01,
                  }
                : {
                      duration: 0,
                  },
        [isInit, isInteracting, isMint, isOut],
    )

    // using useEffect instead of motion.div onAnimationComplete because
    // it is terrible to try and test
    useEffect(() => {
        if (isMint) {
            const timeout = setTimeout(() => {
                onAnimationComplete?.()
            }, 3500)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isMint, onAnimationComplete])

    return (
        <motion.div
            animate={
                {
                    ['--tk-h']: mint,

                    ['--tk-mint']: 1 - mint,

                    ['--tk-rad']: isOut ? 0 : a * mint,
                    ['--tk-rad-abs']: isOut ? 0 : Math.abs(a) * mint,

                    ['--tk-x']: isOut ? 0 : x * mint,
                    ['--tk-y']: isOut ? 0 : y * mint,

                    ['--tk-mx']: isOut ? +0.5 : x * mint,
                    ['--tk-my']: isOut ? -0.5 : y * mint,

                    ['--tk-ax']: isOut ? 0 : Math.abs(x) * mint,
                    ['--tk-ay']: isOut ? 0 : Math.abs(y) * mint,

                    ['--tk-d']: isOut ? 1 : 10 * distance * mint,

                    ['--tk-px']: isOut ? +0.6 : Math.cos(2 * mint) * 0.8,
                    ['--tk-py']: isOut ? -0.6 : Math.sin(2 * mint) * 0.8,

                    transition: isMint
                        ? {
                              ['--tk-mint']: {
                                  duration: 2.5,
                                  delay: 1,
                              },
                              default: transition,
                          }
                        : transition,
                } as TargetAndTransition
            }
            initial={
                {
                    ['--tk-h']: 1,

                    ['--tk-mint']: 1 - 0,

                    ['--tk-rad']: 1,
                    ['--tk-rad-abs']: 1,

                    ['--tk-x']: 1,
                    ['--tk-y']: 1,

                    ['--tk-mx']: 0.2,
                    ['--tk-my']: 0.25,

                    ['--tk-ax']: 10,
                    ['--tk-ay']: 0.25,

                    ['--tk-d']: 1,

                    ['--tk-px']: Math.cos(1) * 0.8,
                    ['--tk-py']: Math.sin(1) * 0.8,
                } as Target
            }
            transition={transition}
            style={{
                width: config.containerSize,
                height: config.containerSize,
                userSelect: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: vars.space.lg,
            }}
        >
            <Box
                ref={ref}
                style={
                    {
                        cursor: isOut ? undefined : 'pointer',
                        width: config.containerSize,
                        height: config.containerSize,
                    } as React.CSSProperties
                }
            >
                <TownsToken
                    key={props.imageSrcRenderKey}
                    {...props}
                    onMouseMove={onMouseMove}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                />
            </Box>
        </motion.div>
    )
}
