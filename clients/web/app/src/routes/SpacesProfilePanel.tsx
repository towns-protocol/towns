import React, { useMemo } from 'react'
import { matchRoutes, useLocation, useNavigate, useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    createUserIdFromString,
    useMatrixCredentials,
    useMyProfile,
    useSpaceMembers,
} from 'use-zion-client'
import { useGetUserBio } from 'hooks/useUserBio'
import { Box, Button, Icon, Panel, PanelButton, Paragraph, Stack, Text } from '@ui'
import { UserProfile } from '@components/UserProfile/UserProfile'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAuth } from 'hooks/useAuth'
import { useStore } from 'store/store'

export const SpaceProfilePanel = (props: { children?: React.ReactNode }) => {
    const [search] = useSearchParams()
    const cameFromSpaceInfoPanel = search.get('spaceInfo') !== null
    const { profileId } = useParams()

    const navigate = useNavigate()

    const onClose = useEvent(() => {
        navigate('..')
    })

    const onBack = useEvent(() => {
        navigate(-1)
    })

    const { logout } = useAuth()

    const onLogoutClick = useEvent(() => {
        logout()
    })

    const profileUser = useMyProfile()
    const { membersMap } = useSpaceMembers()
    const location = useLocation()
    const isMeRoute = matchRoutes([{ path: '/me' }], location) || profileId === 'me'

    const user = useMemo(
        () =>
            isMeRoute
                ? {
                      ...profileUser,
                      userId: profileUser?.userId ?? '',
                      name: profileUser?.displayName ?? '',
                  }
                : profileId
                ? membersMap[profileId]
                : undefined,
        [isMeRoute, membersMap, profileId, profileUser],
    )

    const isValid = !!user

    const userAddress = isValid ? createUserIdFromString(user.userId)?.accountAddress : undefined
    const { data: userBio } = useGetUserBio(userAddress)

    const { userId: loggedInUserId } = useMatrixCredentials()
    const loggedInUserAddress = loggedInUserId
        ? createUserIdFromString(loggedInUserId)?.accountAddress
        : undefined

    const canEdit = loggedInUserAddress === userAddress

    const { setTheme, theme } = useStore((state) => ({
        theme: state.theme,
        setTheme: state.setTheme,
    }))

    const onThemeClick = () => {
        setTheme(theme === 'light' ? 'dark' : 'light')
    }

    return (
        <Panel label="Profile" onClose={onClose}>
            <Stack gap>
                {isValid ? (
                    <UserProfile
                        center
                        userId={user.userId}
                        displayName={getPrettyDisplayName(user).name}
                        userAddress={userAddress}
                        userBio={userBio}
                        canEdit={canEdit}
                    />
                ) : (
                    <Stack padding>
                        <Paragraph>Profile not found</Paragraph>
                    </Stack>
                )}

                {cameFromSpaceInfoPanel && (
                    <Box centerContent>
                        <Button
                            width="auto"
                            tone="none"
                            size="button_sm"
                            style={{
                                boxShadow: 'none',
                            }}
                            onClick={onBack}
                        >
                            <Text color="cta1">Back to space info</Text>
                        </Button>
                    </Box>
                )}
                {user?.userId === profileUser?.userId ? (
                    <Stack padding gap paddingBottom="lg">
                        <PanelButton onClick={onThemeClick}>
                            <Box
                                border
                                centerContent
                                rounded="sm"
                                aspectRatio="1/1"
                                height="height_md"
                                background="inverted"
                            >
                                Aa
                            </Box>
                            <Paragraph color="default">Switch theme</Paragraph>
                        </PanelButton>

                        <PanelButton tone="negative" onClick={onLogoutClick}>
                            <Icon type="logout" size="square_sm" />
                            <Paragraph>Logout</Paragraph>
                        </PanelButton>
                    </Stack>
                ) : undefined}
            </Stack>
        </Panel>
    )
}
