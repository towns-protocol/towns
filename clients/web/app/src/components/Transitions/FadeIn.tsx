import React, { forwardRef } from 'react'
import { HTMLMotionProps, motion } from 'framer-motion'
import { Box, BoxProps } from '@ui'

type Props = {
    children: React.ReactNode
    delay?: boolean | number
    fast?: boolean
    useScale?: boolean
    disabled?: boolean
    layout?: boolean | 'position'
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
        const { disabled, layout, fast, delay, useScale, ...boxProps } = props
        const transition = generateTransition({ layout, fast, delay, useScale })
        return disabled ? (
            <>{props.children}</>
        ) : (
            <MotionBox {...boxProps} {...transition} ref={ref} />
        )
    },
)

const MotionBox = motion(Box)

const generateTransition = ({ layout, fast, delay, useScale }: Omit<Props, 'children'>) => {
    return {
        layout: layout,
        transition: {
            duration: fast ? 0.16 : 0.33,
            delay: typeof delay === 'number' ? delay : delay ? 0.1 : 0,
        },
        variants: {
            hide: { opacity: 0, scale: useScale ? 0.5 : undefined },
            show: { opacity: 1, scale: useScale ? 1 : undefined },
        },
        initial: 'hide',
        animate: 'show',
        exit: 'hide',
    } as const
}
