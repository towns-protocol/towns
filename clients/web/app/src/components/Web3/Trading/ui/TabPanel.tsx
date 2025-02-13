import { AnimatePresence } from 'framer-motion'

import React from 'react'
import { Box, BoxProps, MotionBox, Stack } from '@ui'

export const TabPanel = (
    props: {
        value: string
        children: React.ReactNode
        tabs: { label: string; value: string }[]
        onChange: (tab: string) => void
    } & Omit<BoxProps, 'onChange'>,
) => {
    const { tabs, onChange, children, value, ...boxProps } = props

    return (
        <Stack {...boxProps}>
            <Stack horizontal>
                {tabs.map((tab) => {
                    const isSelected = value === tab.value
                    return (
                        <Box
                            grow
                            borderBottom
                            cursor="pointer"
                            key={tab.value}
                            height="x4"
                            onClick={() => onChange(tab.value)}
                        >
                            <Box centerContent grow>
                                {tab.label}
                            </Box>
                            <AnimatePresence>
                                {isSelected ? (
                                    <MotionBox
                                        height="2"
                                        background="cta2"
                                        layoutId="tab"
                                        layout="position"
                                    />
                                ) : (
                                    <Box height="2" />
                                )}
                            </AnimatePresence>
                        </Box>
                    )
                })}
            </Stack>
            {children}
        </Stack>
    )
}
