import React from 'react'

import { TransitionLogo } from '@components/Logo/Logo'
import { Box, Paragraph, Stack } from '@ui'

export const WelcomeLayout = (props: { children?: React.ReactNode; debugText?: string }) => (
    <Stack centerContent scroll height="100vh" background="level1" width="100vw">
        <Stack padding justifyContent="end">
            <TransitionLogo />
        </Stack>
        <Stack padding>
            <Stack justifyContent="start" minHeight="height_xl" gap="lg">
                {props.children}
            </Stack>
        </Stack>
        {props.debugText && (
            <Box paddingTop="safeAreaInsetTop" position="topLeft" key={props.debugText}>
                <Box paddingTop="lg" paddingX="xs">
                    <Paragraph color="gray2" size="xs" textTransform="uppercase">
                        {props.debugText}
                    </Paragraph>
                </Box>
            </Box>
        )}
    </Stack>
)
