import React from 'react'
import { useNavigate, useParams } from 'react-router'
import useEvent from 'react-use-event-hook'
import { createUserIdFromString, useSpaceMembers } from 'use-zion-client'
import { Panel, Paragraph, Stack } from '@ui'
import { UserProfile } from '@components/UserProfile/UserProfile'

export const SpaceProfilePanel = (props: { children?: React.ReactNode }) => {
    const { profileId } = useParams()
    const navigate = useNavigate()

    const onClose = useEvent(() => {
        navigate('..')
    })

    const { membersMap } = useSpaceMembers()

    const user = profileId ? membersMap[profileId] : undefined

    const isValid = !!user

    const userAddress = isValid ? createUserIdFromString(user.userId)?.accountAddress : undefined

    const info = [
        {
            title: 'Bio',
            content: (
                <>
                    Please come back when I have written my bio. It shouldn&apos; be more thans a
                    few lines written in a way that makes you want to know more about me.
                </>
            ),
        },
    ]

    return (
        <Stack grow height="100%" overflow="hidden">
            <Panel label="Profile" onClose={onClose}>
                {isValid ? (
                    <UserProfile
                        center
                        displayName={user.name}
                        avatarUrl={user.avatarUrl}
                        userAddress={userAddress}
                        info={info}
                    />
                ) : (
                    <Stack padding>
                        <Paragraph>Profile not found</Paragraph>
                    </Stack>
                )}
            </Panel>
        </Stack>
    )
}
