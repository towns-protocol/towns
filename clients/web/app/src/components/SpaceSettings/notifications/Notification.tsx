import { motion } from 'framer-motion'
import React, { forwardRef } from 'react'
import { Stack } from '@ui'

const Notification = forwardRef((props: { children: React.ReactNode }) => {
    return (
        <Stack
            horizontal
            gap
            padding
            grow
            alignItems="center"
            justifyContent="spaceBetween"
            position="relative"
            background="level3"
            rounded="sm"
        >
            {props.children}
        </Stack>
    )
})

export const notificationMotion = {
    variants: {
        hide: { opacity: 0, y: 80 },
        show: { opacity: 1, y: 0 },
    },
    initial: 'hide',
    animate: 'show',
    exit: 'hide',
}

export const MotionNotification = motion(Notification)
