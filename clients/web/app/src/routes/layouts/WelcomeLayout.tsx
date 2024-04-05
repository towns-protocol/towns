import React from 'react'
import AnalyticsService, { AnalyticsEvents } from 'use-towns-client/dist/utils/analyticsService'
import { TransitionLogo } from '@components/Logo/Logo'
import { Box, MotionBox, Paragraph, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { TimelineShimmer } from '@components/Shimmer'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { AppPanelLayoutSkeleton } from './AppPanelLayoutSkeleton'

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

export const AppSkeletonView = (props: { progress?: number }) => {
    const { isTouch } = useDevice()
    return (
        <>
            {isTouch ? <TimelineShimmer /> : <AppPanelLayoutSkeleton />}
            {props.progress !== undefined && (
                <ModalContainer minWidth="200" onHide={() => {}}>
                    {<WelcomeProgressBar progress={props.progress} />}
                </ModalContainer>
            )}
        </>
    )
}

const WelcomeProgressBar = (props: { progress: number }) => {
    const { progress } = props
    return (
        <Stack gap centerContent>
            <Text color="default" size="md" fontWeight="medium">
                Setting up local workspace
            </Text>
            <Box border="textDefault" height="x1" rounded="xs" overflow="hidden" width="200">
                <MotionBox
                    width="100%"
                    height="100%"
                    background="inverted"
                    initial={{
                        scaleX: 0,
                        originX: 0,
                    }}
                    animate={{
                        scaleX: progress,
                    }}
                    transition={{ duration: 0.1 }}
                />
            </Box>
        </Stack>
    )
}
