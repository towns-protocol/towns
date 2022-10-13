import React, { useCallback } from 'react'
import { Outlet, useMatch, useResolvedPath } from 'react-router'
import { NavLink } from 'react-router-dom'

import {
    Membership,
    RoomIdentifier,
    SpaceData,
    useSpaceData,
    useSpaceId,
    useZionClient,
} from 'use-zion-client'
import { Box, Button, Paragraph, SizeBox } from '@ui'
import { Stack } from 'ui/components/Stack/Stack'
import { LiquidContainer } from './SpacesIndex'

export const SpaceHome = () => {
    const spaceId = useSpaceId()
    const space = useSpaceData()

    if (!spaceId || !space) {
        return null
    }

    return (
        <Stack horizontal grow justifyContent="center" basis="1200">
            <LiquidContainer fullbleed position="relative">
                {space.membership === Membership.Join ? (
                    <SizeBox grow gap="lg">
                        <Box paddingX="lg" paddingTop="lg">
                            <SpaceNav spaceId={spaceId} />
                        </Box>
                        <Box grow position="relative" paddingX="lg">
                            <Outlet />
                        </Box>
                    </SizeBox>
                ) : (
                    <JoinSpace space={space} />
                )}
            </LiquidContainer>
        </Stack>
    )
}

export const SpaceNav = (props: { spaceId: RoomIdentifier }) => (
    <Stack horizontal gap="md">
        <SpaceNavItem to={`/spaces/${props.spaceId.slug}/`}>Highlights</SpaceNavItem>
        <SpaceNavItem to={`/spaces/${props.spaceId.slug}/proposals`}>Proposals</SpaceNavItem>
        <SpaceNavItem to={`/spaces/${props.spaceId.slug}/members`}>Members</SpaceNavItem>
    </Stack>
)

const SpaceNavItem = (props: { children: React.ReactNode; to: string; exact?: boolean }) => {
    const { to, exact } = props
    const resolved = useResolvedPath(`/${to === '/' ? '' : to}`)

    const match = useMatch({
        path: resolved.pathname || '/',
        end: to === '/' || exact,
    })
    return (
        <Box>
            <NavLink to={props.to}>
                <Button size="button_md" tone={match ? 'cta1' : 'level2'}>
                    {props.children}
                </Button>
            </NavLink>
        </Box>
    )
}

const JoinSpace = (props: { space: SpaceData }) => {
    const { space } = props
    const { joinRoom } = useZionClient()
    const joinSpace = useCallback(() => {
        if (space.id) {
            joinRoom(space.id)
        }
    }, [joinRoom, space.id])

    return (
        <Box centerContent absoluteFill>
            <Button tone="cta1" animate={false} onClick={joinSpace}>
                Join <Paragraph strong>{space.name}</Paragraph>
            </Button>
        </Box>
    )
}

export default SpaceHome
