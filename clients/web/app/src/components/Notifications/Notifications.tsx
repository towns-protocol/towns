import React from 'react'
import { Toast, useToaster } from 'react-hot-toast/headless'
import { AnimatePresence } from 'framer-motion'
import { Box, MotionBox } from '@ui'

export const Notifications = () => {
    const { toasts, handlers } = useToaster()
    const { startPause, endPause, calculateOffset, updateHeight } = handlers
    return (
        <Box
            position="fixed"
            zIndex="tooltipsAbove"
            right="lg"
            bottom="lg"
            display="block"
            onMouseEnter={startPause}
            onMouseLeave={endPause}
        >
            <AnimatePresence>
                {toasts.map((toast) => {
                    const offset = calculateOffset(toast, {
                        reverseOrder: true,
                    })
                    const ref = (el: HTMLDivElement) => {
                        if (el && typeof toast.height !== 'number') {
                            const height = el.getBoundingClientRect().height
                            updateHeight(toast.id, height)
                        }
                    }

                    return (
                        <MotionBox
                            layout
                            display="block"
                            key={toast.id}
                            ref={ref}
                            position="absolute"
                            right="sm"
                            bottom="sm"
                            transition={{
                                duration: 0.2,
                            }}
                            variants={{
                                hide: { opacity: 0 },
                                show: { opacity: toast.visible ? 1 : 0, y: `${-offset}px` },
                            }}
                            initial="hide"
                            animate="show"
                            exit="hide"
                        >
                            <Box
                                horizontal
                                background="level2"
                                padding="md"
                                rounded="sm"
                                border="default"
                            >
                                {(toast.message as (toast: Toast) => JSX.Element)(toast)}
                            </Box>
                        </MotionBox>
                    )
                })}
            </AnimatePresence>
        </Box>
    )
}
