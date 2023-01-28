import React from 'react'
import { Link } from 'react-router-dom'
import { RoomMember, createUserIdFromString, useSpaceMembers } from 'use-zion-client'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { Avatar, Grid, Paragraph, Stack } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpaceMembers = () => {
    const { members } = useSpaceMembers()
    return (
        <CentralPanelLayout>
            <Stack height="100%">
                <Stack borderBottom horizontal paddingX="lg" minHeight="x8" alignItems="center">
                    <Paragraph strong size="lg">
                        Members
                    </Paragraph>
                </Stack>
                <Stack grow overflowY="scroll">
                    <Grid padding="lg" columnMinSize="130px">
                        {members.map((member) => (
                            <GridProfile member={member} key={member.userId} />
                        ))}
                    </Grid>
                </Stack>
            </Stack>
        </CentralPanelLayout>
    )
}

const GridProfile = ({ member }: { member: RoomMember }) => {
    const accountAddress = createUserIdFromString(member.userId)?.accountAddress
    return (
        <Link to={`profile/${member?.userId}/`}>
            <Stack centerContent gap padding>
                <Avatar src={member.avatarUrl} size="avatar_x15" />
                <Paragraph>{member.name}</Paragraph>
                {accountAddress && accountAddress && (
                    <ClipboardCopy
                        label={shortAddress(accountAddress)}
                        clipboardContent={accountAddress}
                    />
                )}
            </Stack>
        </Link>
    )
}
