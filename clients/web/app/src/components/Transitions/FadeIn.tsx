import React, { forwardRef } from 'react'
import { HTMLMotionProps, motion } from 'framer-motion'
import { BoxProps, MotionBox } from '@ui'

type Props = {
    children?: React.ReactNode
    delay?: boolean | number
    fast?: boolean
    disabled?: boolean
    layout?: boolean | 'position'
    preset?: keyof typeof presets
}

export const FadeIn = forwardRef<HTMLDivElement, Props & HTMLMotionProps<'div'>>((props, ref) => {
    const { disabled, layout, fast, delay } = props
    const transition = generateTransition({ layout, fast, delay })
    return disabled ? (
        <>{props.children}</>
    ) : (
        <motion.div {...transition} ref={ref}>
            {props.children}
        </motion.div>
    )
})

export const FadeInBox = forwardRef<HTMLDivElement, BoxProps & Props & HTMLMotionProps<'div'>>(
    (props, ref) => {
        const { disabled, layout, fast, delay, preset, ...boxProps } = props
        const transition = generateTransition({ layout, fast, delay, preset })
        return disabled ? (
            <>{props.children}</>
        ) : (
            <MotionBox {...boxProps} {...transition} ref={ref} />
        )
    },
)

const presets = {
    fade: {
        hide: { opacity: 0 },
        show: { opacity: 1 },
    },
    scale: {
        hide: { opacity: 0, scale: 0.5 },
        show: { opacity: 1, scale: 1 },
    },
    fadeup: {
        hide: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
    },
} as const

const generateTransition = ({ layout, fast, delay, preset = 'fade' }: Omit<Props, 'children'>) => {
    const variants = presets[preset]
    return {
        layout: layout,
        transition: {
            duration: fast ? 0.16 : 0.33,
            delay: typeof delay === 'number' ? delay : delay ? 0.1 : 0,
        },
        variants,
        initial: 'hide',
        animate: 'show',
        exit: 'hide',
    } as const
}
