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
import { Box, Button, Icon, Paragraph, Stack, Text } from '@ui'
import { UserProfile } from '@components/UserProfile/UserProfile'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAuth } from 'hooks/useAuth'
import { useStore } from 'store/store'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { Panel, PanelButton } from '@components/Panel/Panel'

export const SpaceProfilePanel = (props: { children?: React.ReactNode }) => {
    const navigate = useNavigate()

    const onClose = useEvent(() => {
        navigate('..')
    })

    return (
        <Panel label="Profile" onClose={onClose}>
            <SpaceProfile {...props} />
        </Panel>
    )
}

export const SpaceProfile = (props: { children?: React.ReactNode }) => {
    const [search] = useSearchParams()
    const cameFromSpaceInfoPanel = search.get('spaceInfo') !== null
    const { profileId = 'me' } = useParams()
    const { requestPushPermission, simplifiedPermissionState } = usePushNotifications()

    const navigate = useNavigate()

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
                    {simplifiedPermissionState === 'soft-denied' && (
                        <>
                            <PanelButton onClick={requestPushPermission}>
                                <Box width="height_md" alignItems="center">
                                    <Icon type="bell" size="square_sm" />
                                </Box>
                                <Paragraph>Enable push notifications</Paragraph>
                            </PanelButton>
                        </>
                    )}

                    {simplifiedPermissionState === 'hard-denied' && (
                        <PanelButton height="auto" onClick={requestPushPermission}>
                            <Stack horizontal gap="sm" alignItems="center">
                                <Box width="height_md" alignItems="center">
                                    <Icon type="bell" size="square_sm" />
                                </Box>
                                <Stack>
                                    <Paragraph fontWeight="strong" size="md">
                                        Enable Push Notifications
                                    </Paragraph>

                                    <Paragraph size="md">
                                        Look for the padlock or <strong>Secure</strong> sign in the
                                        address bar.
                                        <br />
                                        Click on it, and a menu will appear.
                                        <br />
                                        Find <strong>Notifications</strong> and choose{' '}
                                        <strong>Enable</strong>
                                    </Paragraph>
                                </Stack>
                            </Stack>
                        </PanelButton>
                    )}
                    <PanelButton onClick={onThemeClick}>
                        <Box
                            border
                            centerContent
                            rounded="sm"
                            aspectRatio="1/1"
                            height="height_md"
                            background="inverted"
                            alignItems="center"
                        >
                            Aa
                        </Box>
                        <Paragraph color="default">Switch theme</Paragraph>
                    </PanelButton>

                    <PanelButton tone="negative" onClick={onLogoutClick}>
                        <Box width="height_md" alignItems="center">
                            <Icon type="logout" size="square_sm" />
                        </Box>
                        <Paragraph>Logout</Paragraph>
                    </PanelButton>
                </Stack>
            ) : undefined}
        </Stack>
    )
}
