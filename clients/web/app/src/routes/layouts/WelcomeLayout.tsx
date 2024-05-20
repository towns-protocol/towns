import React from 'react'
import AnalyticsService, { AnalyticsEvents } from 'use-towns-client/dist/utils/analyticsService'
import { TransitionLogo } from '@components/Logo/Logo'
import { Box, Paragraph, Stack } from '@ui'

export const WelcomeLayout = (props: { children?: React.ReactNode; debugText?: string }) => {
    AnalyticsService.getInstance().trackEventOnce(AnalyticsEvents.Welcome)
    return (
        <>
            <Stack centerContent scroll height="100vh" background="level1" width="100vw">
                <Stack padding justifyContent="end" alignItems="center">
                    <TransitionLogo />
                </Stack>
                <Stack padding>
                    <Stack justifyContent="start" minHeight="height_xl" gap="lg">
                        {props.children}
                    </Stack>
                </Stack>
            </Stack>
            {props.debugText && (
                <Box padding position="bottomRight" key={props.debugText} overflow="hidden">
                    <Paragraph color="gray2" size="xs" textTransform="uppercase">
                        {props.debugText}
                    </Paragraph>
                </Box>
            )}
        </>
    )
}
