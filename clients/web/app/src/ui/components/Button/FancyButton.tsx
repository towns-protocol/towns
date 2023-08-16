import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useEffect, useState } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { Icon, IconName } from '../Icon'
import { MotionBox, MotionParagraph, MotionStack } from '../Motion/MotionComponents'
import { ButtonSpinner } from '../Spinner/ButtonSpinner'
import * as fancyButtonStyle from './FancyButton.css'

type FancyButtonProps = {
    children?: string
    cta?: boolean
    spinner?: boolean
    disabled?: boolean
    icon?: IconName
    onClick?: () => void
}

/**
 * Convulted button that enables background transitions
 */
export const FancyButton = (props: FancyButtonProps) => {
    const { icon, spinner, disabled } = props
    const background = props.cta ? 'cta1' : 'level3'

    const before = spinner ? (
        <ButtonSpinner />
    ) : icon ? (
        <Icon type={icon} size="square_inline" />
    ) : null

    const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | false>(false)
    useEffect(() => {
        if (ripple) {
            const timeout = setTimeout(() => {
                setRipple(false)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [ripple])

    const onTap = useCallback((event: React.PointerEvent) => {
        const b = event.currentTarget.getBoundingClientRect()
        setRipple((p) => ({
            x: event.clientX - b.left,
            y: event.clientY - b.top,
            key: p ? p.key + 1 : 0,
        }))
    }, [])

    const fadedOpacity = disabled && !spinner ? 0.4 : 1

    return (
        <MotionBox
            layout
            horizontal
            centerContent
            whileTap="tap"
            paddingY="md"
            as="button"
            borderRadius="sm"
            initial="hide"
            animate="show"
            exit="hide"
            background={background}
            height="x6"
            paddingX="lg"
            style={
                {
                    background: 'transparent',
                    userSelect: 'none',
                    ['--center']: ripple ? `${ripple.x}px ${ripple.y}px` : undefined,
                } as React.CSSProperties
            }
            position="relative"
            transition={{
                layout: {
                    duration: 0.2,
                },
            }}
            // sets color defaults while hiding the background
            cursor={spinner ? 'wait' : disabled ? 'not-allowed' : 'pointer'}
            onPointerDown={onTap}
            onClick={!disabled ? props.onClick : undefined}
        >
            <AnimatePresence>{<Background tone={background} key={background} />}</AnimatePresence>

            <AnimatePresence>
                {/* AnimatePresence allows multiple ripples to appear simulaneously until the last one times-out */}
                {ripple && (
                    <MotionBox
                        absoluteFill
                        borderRadius="sm"
                        key={`ripple-${ripple.key}`}
                        initial={{ scale: 0.97 }}
                        overflow="hidden"
                        className={fancyButtonStyle.ripple}
                        exit={{ transition: { delay: 0.6 } }}
                    />
                )}
            </AnimatePresence>

            <MotionStack horizontal centerContent gap="sm" position="relative" color="inherit">
                {before ? (
                    <Box centerContent square="square_inline">
                        <MotionBox
                            layout="position"
                            key={spinner ? 'spinner' : icon}
                            variants={{
                                hide: {
                                    opacity: 0,
                                },
                                show: {
                                    opacity: fadedOpacity,
                                },
                            }}
                            initial="hide"
                            animate="show"
                            transition={{
                                ease: 'easeIn',
                                duration: 0.4,
                                layout: {
                                    duration: 0.2,
                                },
                            }}
                        >
                            {before}
                        </MotionBox>
                    </Box>
                ) : (
                    <></>
                )}
                <MotionParagraph
                    variants={{
                        hide: {
                            opacity: 0,
                        },
                        show: {
                            opacity: fadedOpacity,
                        },
                    }}
                    style={{
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                    }}
                    initial="hide"
                    exit="hide"
                    animate="show"
                    key={props.children}
                    layout="position"
                    fontWeight="medium"
                    color="inherit"
                    transition={{
                        ease: 'easeIn',
                        delay: 0,
                        duration: 0.4,
                        layout: {
                            delay: 0,
                            duration: 0.2,
                        },
                    }}
                >
                    {props.children}
                </MotionParagraph>
            </MotionStack>
        </MotionBox>
    )
}

const Background = (props: { tone: BoxProps['background'] }) => {
    const { tone } = props
    return (
        <MotionBox
            absoluteFill
            borderRadius="sm"
            background={tone}
            transition={{
                duration: 0.6,
            }}
            variants={{
                hide: { opacity: 0 },
                show: { opacity: 1 },
                tap: {
                    scale: 0.97,
                    opacity: 1,
                    transition: {
                        duration: 0.2,
                    },
                },
            }}
        />
    )
}
