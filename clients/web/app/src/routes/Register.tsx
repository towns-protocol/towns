import React from 'react'
import { Box, Stack, Text } from '@ui'
import { SignupForm } from '@components/RegisterForm'

export const Register = ({ isEdit = false }: { isEdit?: boolean }) => {
    return (
        <Stack alignItems="center" height="100%" paddingY="x4">
            <Stack grow width="600">
                <Box paddingY="x4">
                    <Text strong size="lg" textAlign="center">
                        Join Towns
                    </Text>
                </Box>
                <SignupForm isEdit={isEdit} />
            </Stack>
        </Stack>
    )
}
