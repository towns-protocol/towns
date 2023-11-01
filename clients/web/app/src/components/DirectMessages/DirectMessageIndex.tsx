import React from 'react'
import { Outlet, useOutlet } from 'react-router'
import { Box, Heading, Icon, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { DirectMessages } from './DirectMessages'

export const DirectMessageIndex = () => {
    const { isTouch } = useDevice()
    const outlet = useOutlet()
    return isTouch ? (
        <>
            <Box absoluteFill background="level1">
                <DirectMessages />
                <Outlet />
            </Box>
        </>
    ) : (
        outlet ?? (
            <Stack centerContent grow scroll absoluteFill>
                <Stack centerContent gap="lg" width="250" minHeight="100svh">
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type="message" size="square_sm" />
                    </Box>
                    <Heading level={3}>No message thread selected</Heading>
                    <Paragraph textAlign="center" color="gray2">
                        Direct messages are end to end encrypted conversations between you and other
                        users
                    </Paragraph>
                </Stack>
            </Stack>
        )
    )
}
