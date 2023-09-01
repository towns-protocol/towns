import React from 'react'
import { Box, Stack, Text } from '@ui'
import { SignupForm } from '@components/RegisterForm'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import { useDevice } from 'hooks/useDevice'

export const Register = () => {
    const { isTouch } = useDevice()
    const offset = isTouch ? 'none' : 'lg'
    return (
        <Stack
            overflow="auto"
            alignItems="center"
            height="100%"
            paddingY={isTouch ? 'none' : 'x4'}
            paddingX="lg"
        >
            <Stack grow width={isTouch ? 'auto' : '600'}>
                <Box paddingY="x4">
                    <Text strong size="lg" textAlign="center">
                        Join Towns
                    </Text>
                </Box>
                <SignupForm />
            </Stack>
            <Box
                position={isTouch ? 'relative' : 'fixed'}
                left={offset}
                bottom={offset}
                padding="lg"
            >
                <SentryReportModal />
            </Box>
        </Stack>
    )
}
