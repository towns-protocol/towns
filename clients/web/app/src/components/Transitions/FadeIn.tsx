import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Box, BoxProps } from '@ui'

type Props = {
    children: React.ReactNode
    delay?: boolean | number
    fast?: boolean
    disabled?: boolean
    layout?: boolean
}

export const FadeIn = (props: Props) => {
    const { disabled, layout, fast, delay } = props
    const transition = generateTransition({ layout, fast, delay })
    return disabled ? (
        <>{props.children}</>
    ) : (
        <motion.div {...transition}>{props.children}</motion.div>
    )
}

export const FadeInBox = forwardRef<HTMLDivElement, BoxProps & Props>((props: Props) => {
    const { disabled, layout, fast, delay, ...boxProps } = props
    const transition = generateTransition({ layout, fast, delay })
    return disabled ? <>{props.children}</> : <MotionBox {...boxProps} {...transition} />
})

const MotionBox = motion(Box)

const generateTransition = ({ layout, fast, delay }: Omit<Props, 'children'>) => {
    return {
        layout: layout,
        transition: {
            duration: fast ? 0.16 : 0.33,
            delay: typeof delay === 'number' ? delay : delay ? 0.1 : 0,
        },
        variants: { hide: { opacity: 0 }, show: { opacity: 1 } },
        initial: 'hide',
        animate: 'show',
        exit: 'hide',
    } as const
}
