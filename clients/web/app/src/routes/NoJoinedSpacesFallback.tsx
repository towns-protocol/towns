import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Membership, useZionClient, useZionContext } from 'use-zion-client'
import { ErrorReportModal } from '@components/ErrorReport/ErrorReport'
import { Box, Button, Heading, Stack, Text } from '@ui'
import { useWaitForInitialSync } from 'hooks/useWaitForInitialSync'
import { PATHS } from 'routes'
import { env } from 'utils'

import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { useAuth } from 'hooks/useAuth'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const NoJoinedSpacesFallback = () => {
    const navigate = useNavigate()
    const { spaces } = useZionContext()
    const { client } = useZionClient()
    const { logout } = useAuth()
    const initialSyncComplete = useWaitForInitialSync()
    const spaceIdBookmark = useStore((s) => {
        return s.spaceIdBookmark
    })

    const { isTouch } = useDevice()

    useEffect(() => {
        if (!initialSyncComplete) {
            return
        }
        if (!client) {
            return
        }
        if (spaces.length) {
            const firstSpaceId =
                spaces.find((space) => space.id === spaceIdBookmark)?.id ?? spaces[0].id

            const firstSpace = client.getRoomData(firstSpaceId)
            if (firstSpace?.membership === Membership.Join) {
                navigate(`/${PATHS.SPACES}/${firstSpaceId}/`)
            }
        }
    }, [spaces, navigate, initialSyncComplete, client, spaceIdBookmark])

    if (!initialSyncComplete || spaces.length) {
        return isTouch ? <WelcomeLayout debugText="no joined space fallback" /> : <></>
    }

    return (
        <CentralPanelLayout>
            <Stack
                centerContent
                height="100vh"
                data-testid="space-home-fallback-content"
                paddingX="lg"
            >
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
                            <Stack gap>
                                <Button
                                    tone="cta1"
                                    onClick={() => window.open(env.VITE_TYPEFORM_ALPHA_URL)}
                                >
                                    Join alpha
                                </Button>
                                <Button tone="level2" onClick={logout}>
                                    Log out
                                </Button>
                            </Stack>
                        </Box>
                    </Stack>
                </Stack>
                <Box
                    centerContent={isTouch}
                    position="absolute"
                    width="100%"
                    paddingBottom="lg"
                    paddingLeft={isTouch ? 'none' : 'lg'}
                    bottom="none"
                >
                    <div>
                        <ErrorReportModal />
                    </div>
                </Box>
            </Stack>
        </CentralPanelLayout>
    )
}
