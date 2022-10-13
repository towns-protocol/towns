import React from 'react'
import { Box, Heading, Stack } from '@ui'
import { SignupForm } from '@components/RegisterForm'

export const Register = () => {
    return (
        <Stack alignItems="center" height="100%" paddingY="lg">
            <Stack grow width="600">
                <Box paddingY="lg">
                    <Heading level={2} textAlign="center">
                        Join Zion
                    </Heading>
                </Box>
                <SignupForm />
            </Stack>
        </Stack>
    )
}
