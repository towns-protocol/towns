import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Membership, useZionClient, useZionContext } from 'use-zion-client'
import { TimelineShimmer } from '@components/Shimmer/TimelineShimmer'
import { Box, Button, Heading, Stack, Text } from '@ui'
import { PATHS } from 'routes'
import { env } from 'utils'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'

import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const NoJoinedSpacesFallback = () => {
    const navigate = useNavigate()
    const { spaces } = useZionContext()
    const { client } = useZionClient()
    const initialSyncComplete = useWaitForInitialSync()

    useEffect(() => {
        if (!initialSyncComplete) {
            return
        }
        if (!client) {
            return
        }
        if (spaces.length) {
            const firstSpaceId = spaces[0].id
            const firstSpace = client.getRoomData(firstSpaceId)
            if (firstSpace?.membership === Membership.Join) {
                navigate(`/${PATHS.SPACES}/${firstSpaceId.slug}`)
            }
        }
    }, [spaces, navigate, initialSyncComplete, client])

    if (!initialSyncComplete) {
        return <TimelineShimmer />
    }

    return (
        <CentralPanelLayout>
            <Stack centerContent height="100vh" data-testid="space-home-fallback-content">
                <Stack centerContent gap="x4" maxWidth="500">
                    <Heading level={2} textAlign="center">
                        You don&apos;t have invitations to any town
                    </Heading>
                    <Stack maxWidth="300" gap="x4">
                        <Text textAlign="center" color="gray2">
                            Want to join Pioneer Town and be able to create new towns?
                        </Text>
                        <Text textAlign="center" color="gray2">
                            Apply here:
                        </Text>
                        <Box horizontal centerContent>
                            <Button
                                tone="cta1"
                                onClick={() => window.open(env.VITE_TYPEFORM_ALPHA_URL)}
                            >
                                Join alpha
                            </Button>
                        </Box>
                        <Box horizontal centerContent>
                            <SentryReportModal />
                        </Box>
                    </Stack>
                </Stack>
            </Stack>
        </CentralPanelLayout>
    )
}
