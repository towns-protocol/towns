import React from 'react'
import { useNavigate, useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import { createUserIdFromString, useMatrixCredentials, useSpaceMembers } from 'use-zion-client'
import { useGetUserBio } from 'hooks/useUserBio'
import { Box, Button, Panel, Paragraph, Stack, Text } from '@ui'
import { UserProfile } from '@components/UserProfile/UserProfile'

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

    const { membersMap } = useSpaceMembers()

    const user = profileId ? membersMap[profileId] : undefined
    const isValid = !!user

    const userAddress = isValid ? createUserIdFromString(user.userId)?.accountAddress : undefined
    const { data: userBio } = useGetUserBio(userAddress)

    const { userId: loggedInUserId } = useMatrixCredentials()
    const loggedInUserAddress = loggedInUserId
        ? createUserIdFromString(loggedInUserId)?.accountAddress
        : undefined

    const canEdit = loggedInUserAddress === userAddress

    return (
        <Stack grow height="100%" overflow="hidden">
            <Panel label="Profile" onClose={onClose}>
                {isValid ? (
                    <UserProfile
                        center
                        userId={user.userId}
                        displayName={user.name}
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
            </Panel>
        </Stack>
    )
}
