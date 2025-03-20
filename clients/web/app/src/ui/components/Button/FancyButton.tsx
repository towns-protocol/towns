import { AnimatePresence } from 'framer-motion'
import React, { ButtonHTMLAttributes, useCallback, useEffect, useState } from 'react'
import { Box, BoxProps } from '../Box/Box'
import { Icon, IconName } from '../Icon'
import { MotionBox, MotionParagraph, MotionStack } from '../Motion/MotionComponents'
import { ButtonSpinner } from '../Spinner/ButtonSpinner'
import * as fancyButtonStyle from './FancyButton.css'
import { IconAtoms } from '../Icon/Icon.css'
import { TextSprinkles } from '../Text/Text.css'

type FancyButtonProps = {
    children?: string
    cta?: boolean
    compact?: boolean | BoxProps['height']
    spinner?: boolean
    disabled?: boolean
    icon?: IconName
    color?: TextSprinkles['color']
    onClick?: () => void
    onClickDisabled?: () => void
    iconSize?: IconAtoms['size']
    layoutRoot?: boolean
} & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'size' | 'color'
> &
    Pick<
        BoxProps,
        | 'width'
        | 'paddingLeft'
        | 'paddingRight'
        | 'paddingX'
        | 'borderRadius'
        | 'boxShadow'
        | 'background'
        | 'gap'
    >

/**
 * Convulted button that enables background transitions
 */
export const FancyButton = React.forwardRef<HTMLButtonElement, FancyButtonProps>((props, ref) => {
    const {
        children,
        cta,
        icon,
        compact = false,
        spinner,
        disabled,
        boxShadow,
        borderRadius = 'sm',
        onClickDisabled,
        gap,
        iconSize,
        color,
        layoutRoot,
        ...buttonProps
    } = props

    const background = cta ? 'cta1' : props.background ?? 'level3'

    const before = spinner ? (
        <ButtonSpinner />
    ) : icon ? (
        <Icon type={icon} size={iconSize ?? 'square_inline'} />
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

    const onTap = useCallback(
        (event: React.PointerEvent) => {
            if (disabled) {
                onClickDisabled?.()
            }
            const b = event.currentTarget.getBoundingClientRect()
            setRipple((p) => ({
                x: event.clientX - b.left,
                y: event.clientY - b.top,
                key: p ? p.key + 1 : 0,
            }))
        },
        [disabled, onClickDisabled],
    )

    const fadedOpacity = disabled && !spinner ? 0.4 : 1

    const onClick = useCallback(() => {
        if (!disabled) {
            props.onClick?.()
        }
    }, [disabled, props])

    return (
        <MotionBox
            layout
            horizontal
            centerContent
            layoutRoot={layoutRoot}
            ref={ref}
            whileTap="tap"
            as="button"
            form={props.form}
            disabled={disabled}
            borderRadius={borderRadius}
            initial="hide"
            animate="show"
            exit="hide"
            background={background}
            height={compact === true ? 'x5' : compact === false ? 'x6' : compact}
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
            onClick={onClick}
            {...buttonProps}
        >
            <AnimatePresence>
                {
                    <Background
                        tone={background}
                        borderRadius={borderRadius}
                        key={background as string}
                        boxShadow={boxShadow}
                    />
                }
            </AnimatePresence>

            <AnimatePresence>
                {/* AnimatePresence allows multiple ripples to appear simulaneously until the last one times-out */}
                {ripple && (
                    <MotionBox
                        absoluteFill
                        pointerEvents="none"
                        borderRadius={borderRadius}
                        key={`ripple-${ripple.key}`}
                        initial={{ scale: 0.97 }}
                        overflow="hidden"
                        className={fancyButtonStyle.ripple}
                        exit={{ transition: { delay: 0.6 } }}
                    />
                )}
            </AnimatePresence>

            <MotionStack
                horizontal
                centerContent
                gap={gap ?? 'sm'}
                position="relative"
                color="inherit"
            >
                {before ? (
                    <Box centerContent square={iconSize ? undefined : 'square_inline'}>
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
                    key={children}
                    layout="position"
                    fontWeight="medium"
                    color={color ?? 'inherit'}
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
                    {children}
                </MotionParagraph>
            </MotionStack>
        </MotionBox>
    )
})

const Background = (props: {
    tone: BoxProps['background']
    borderRadius: BoxProps['borderRadius']
    boxShadow?: BoxProps['boxShadow']
}) => {
    const { tone, borderRadius } = props
    return (
        <MotionBox
            absoluteFill
            boxShadow={props.boxShadow}
            borderRadius={borderRadius}
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
                        duration: 0.01,
                    },
                },
            }}
        />
    )
}
