import React from 'react'
import { Box, BoxProps, Stack, Text } from '@ui'

export const TabPanel = (
    props: {
        layoutId: string
        value: string
        children: React.ReactNode
        tabs: { label: string; value: string }[]
        onChange?: (tab: 'buy' | 'sell') => void
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
                            onClick={() => onChange?.(tab.value as 'buy' | 'sell')}
                        >
                            <Box centerContent grow>
                                <Text
                                    fontWeight={isSelected ? 'strong' : 'normal'}
                                    color={isSelected ? 'default' : 'gray2'}
                                >
                                    {tab.label}
                                </Text>
                            </Box>
                            <Box
                                height="2"
                                background={isSelected ? 'cta2' : 'none'}
                                transition="default"
                            />
                        </Box>
                    )
                })}
            </Stack>
            {children}
        </Stack>
    )
}
