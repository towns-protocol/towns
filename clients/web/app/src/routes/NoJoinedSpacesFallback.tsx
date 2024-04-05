import React, { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Membership, useTownsClient, useTownsContext } from 'use-towns-client'
import { PATHS } from 'routes'
import { Button, Heading, Icon, Stack, Text } from '@ui'

import { useDevice } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { WelcomeLayout } from './layouts/WelcomeLayout'

export const NoJoinedSpacesFallback = () => {
    const navigate = useNavigate()
    const { spaces } = useTownsContext()
    const { client } = useTownsClient()

    const spaceIdBookmark = useStore((s) => {
        return s.spaceIdBookmark
    })

    const { isTouch } = useDevice()

    useEffect(() => {
        if (!client) {
            return
        }
        if (spaces.length) {
            const firstSpaceId =
                spaces.find((space) => space.id === spaceIdBookmark)?.id ?? spaces[0].id

            if (client.getMembership(firstSpaceId) === Membership.Join) {
                navigate(`/${PATHS.SPACES}/${firstSpaceId}/`)
            }
        }
    }, [spaces, navigate, client, spaceIdBookmark])

    const openTownPanel = useCallback(() => {
        navigate(`/${PATHS.SPACES}/new`)
    }, [navigate])

    if (spaces.length || !client) {
        return isTouch ? <WelcomeLayout debugText="no joined space fallback" /> : <></>
    }

    return (
        <Stack centerContent data-testid="space-home-fallback-content" paddingX="lg" height="100%">
            <Stack centerContent gap="x4">
                <Icon padding="md" size="square_xl" type="home" background="level2" />
                <Stack centerContent gap>
                    <Heading level={3} textAlign="center">
                        You don&apos;t have invitations to any town
                    </Heading>
                    <Text textAlign="center" color="gray2">
                        Quit waiting around and start a town now:
                    </Text>
                </Stack>
                <Button tone="cta1" width="auto" grow={false} onClick={openTownPanel}>
                    Create a Town
                </Button>
            </Stack>
        </Stack>
    )
}
