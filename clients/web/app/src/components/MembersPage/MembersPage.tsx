import React from 'react'
import { Link } from 'react-router-dom'
import { RoomMember, getAccountAddress, useSpaceMembers } from 'use-zion-client'
import { CentralPanelLayout } from 'routes/layouts/CentralPanelLayout'
import { shortAddress } from 'ui/utils/utils'
import { Avatar, Grid, Paragraph, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useCreateLink } from 'hooks/useCreateLink'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ModalContainer } from '@components/Modals/ModalContainer'

type Props = {
    members?: RoomMember[]
}

export const MembersPage = (props: Props) => {
    const { members } = props
    return members?.length ? (
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
    ) : (
        <></>
    )
}

export const MembersPageTouchModal = (props: { onHide: () => void }) => {
    const { members } = useSpaceMembers()
    return (
        <ModalContainer touchTitle="Members" onHide={props.onHide}>
            <Stack grow>
                <Grid columnMinSize="130px">
                    {members.map((member) => (
                        <GridProfile member={member} key={member.userId} />
                    ))}
                </Grid>
            </Stack>
        </ModalContainer>
    )
}

const GridProfile = ({ member }: { member: RoomMember }) => {
    const accountAddress = getAccountAddress(member.userId)
    const { createLink } = useCreateLink()
    const link = createLink({ profileId: member.userId })

    const profile = (
        <Stack centerContent gap>
            <Avatar size="avatar_x15" userId={member.userId ?? ''} imageVariant="thumbnail300" />
            <Paragraph textAlign="center">{getPrettyDisplayName(member).initialName}</Paragraph>
        </Stack>
    )

    const linkedProfile = !link ? profile : <Link to={link}>{profile}</Link>

    return (
        <Stack centerContent gap padding>
            {linkedProfile}
            {accountAddress && accountAddress && (
                <ClipboardCopy
                    label={shortAddress(accountAddress)}
                    clipboardContent={accountAddress}
                />
            )}
        </Stack>
    )
}
