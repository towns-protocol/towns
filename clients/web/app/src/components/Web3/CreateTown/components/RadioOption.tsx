import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Box, MotionBox } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { MotionBoxProps } from 'ui/components/Motion/MotionComponents'

export const RadioOption = (props: { selected: boolean; focused: boolean } & MotionBoxProps) => {
    const { children, selected, focused, ...boxProps } = props
    return (
        <MotionBox
            layout="position"
            minWidth="100%"
            position="relative"
            borderRadius="sm"
            style={{
                boxShadow: focused ? `0 0 0 1px ${vars.color.foreground.gray2}` : 'none',
            }}
            {...boxProps}
        >
            <AnimatePresence>
                {selected && (
                    <MotionBox
                        absoluteFill
                        key="selected"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.2 } }}
                        exit={{ opacity: 0, transition: { duration: 0.4 } }}
                        style={{
                            borderRadius: `calc(${vars.borderRadius.sm} + 1px)`,
                            inset: selected ? -2 : -1,
                            backgroundImage: `linear-gradient(to right, ${vars.color.foreground.accent}, ${vars.color.tone.cta1})`,
                        }}
                    />
                )}
            </AnimatePresence>
            <Box
                elevate
                gap
                hoverable
                zIndex="above"
                background="level2"
                padding="md"
                borderRadius="sm"
                position="relative"
                overflow="hidden"
                style={{
                    userSelect: 'none',
                }}
            >
                {children}
            </Box>
        </MotionBox>
    )
}
