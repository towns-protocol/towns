import { TargetAndTransition, Transition, motion } from 'framer-motion'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Box } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { SpaceToken, SpaceTokenProps } from './SpaceToken'

export const InteractiveSpaceToken = (props: SpaceTokenProps) => {
    const { address } = props

    const [{ x, y, a }, setInput] = useState({ x: 0, y: 0, a: 0 })

    const ref = useRef<HTMLDivElement>(null)

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        const bounds = ref.current?.getBoundingClientRect()
        if (bounds) {
            const x = ((e.clientX - bounds.left) / bounds.width - 0.5) * 2
            const y = ((e.clientY - bounds.top) / bounds.height - 0.5) * 2
            const a = Math.atan2(y, x)
            setInput({ x, y, a })
        }
    }, [])

    const distance = Math.sqrt(x * x + y * y)

    const isPop = Math.abs(distance) > 0.85
    const isMint = !!address

    const mint = isMint ? 0 : 1

    const transition: Transition = useMemo(
        () =>
            isMint
                ? {
                      type: 'tween',
                      ease: [1, 0.01, 0.52, 2],
                      duration: 0.5,
                      delay: 1,
                  }
                : !isPop
                ? {
                      type: 'spring',
                      stiffness: 600,
                      damping: 20,
                      restSpeed: 100,
                  }
                : {
                      type: 'spring',
                      stiffness: 400,
                      damping: 10,
                      restSpeed: 0.1,
                  },
        [isMint, isPop],
    )

    return (
        <motion.div
            animate={
                {
                    ['--tk-h']: mint,

                    ['--tk-mint']: 1 - mint,

                    ['--tk-rad']: isPop ? 0 : a * mint,
                    ['--tk-rad-abs']: isPop ? 0 : Math.abs(a) * mint,

                    ['--tk-x']: isPop ? 0 : x * mint,
                    ['--tk-y']: isPop ? 0 : y * mint,

                    ['--tk-mx']: isPop ? +0.5 : x * mint,
                    ['--tk-my']: isPop ? -0.5 : y * mint,

                    ['--tk-ax']: isPop ? 0 : Math.abs(x) * mint,
                    ['--tk-ay']: isPop ? 0 : Math.abs(y) * mint,

                    ['--tk-d']: isPop ? 1 : distance * mint,

                    ['--tk-px']: isPop ? +0.6 : Math.cos(a * mint) * 0.8,
                    ['--tk-py']: isPop ? -0.6 : Math.sin(a * mint) * 0.8,

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
            initial={false}
            transition={transition}
            style={{
                width: '100%',
                height: '100%',
                userSelect: 'none',
                display: 'flex',
                justifyContent: 'center',
                padding: vars.space.lg,
            }}
        >
            <Box
                ref={ref}
                style={
                    {
                        cursor: isPop ? undefined : 'pointer',
                        width: 500,
                        height: 500,
                    } as React.CSSProperties
                }
                onMouseMove={onMouseMove}
            >
                <SpaceToken {...props} />
            </Box>
        </motion.div>
    )
}
