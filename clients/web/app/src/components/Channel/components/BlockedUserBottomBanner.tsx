import React, { useCallback, useState } from 'react'
import { useTownsClient } from 'use-towns-client'
import { Box, Button, Paragraph, Stack } from '@ui'

export const BlockedUserBottomBanner = (props: { userId: string }) => {
    const { userId } = props
    const { updateUserBlock } = useTownsClient()

    const [isRequestInFlight, setIsRequestInFlight] = useState(false)
    const onUnblockClick = useCallback(async () => {
        if (isRequestInFlight) {
            return
        }
        try {
            setIsRequestInFlight(true)
            await updateUserBlock(userId, false)
        } catch (error) {
            console.error('Failed to update user block status:', error)
        } finally {
            setIsRequestInFlight(false)
        }
    }, [isRequestInFlight, updateUserBlock, userId])

    return (
        <>
            <Stack
                horizontal
                background="level2"
                rounded="sm"
                padding="md"
                justifyContent="center"
                alignItems="center"
                maxWidth="100%"
                border="none"
                gap="md"
            >
                <Stack flexDirection="row" gap="md" alignItems="center">
                    <Paragraph color="gray2">{'You have blocked this user.'}</Paragraph>
                </Stack>
                <Box position="relative" height="x5">
                    <Button tone="cta1" onClick={onUnblockClick}>
                        Unblock
                    </Button>
                </Box>
            </Stack>
        </>
    )
}
