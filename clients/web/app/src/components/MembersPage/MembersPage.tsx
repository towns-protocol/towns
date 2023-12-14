import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    RoomMember,
    getAccountAddress,
    useSpaceMembers,
    useUserLookupContext,
} from 'use-zion-client'
import { CentralPanelLayout } from 'routes/layouts/CentralPanelLayout'
import { shortAddress } from 'ui/utils/utils'
import { Box, Grid, Paragraph, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useCreateLink } from 'hooks/useCreateLink'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Avatar } from '@components/Avatar/Avatar'

type Props = {
    memberIds: string[]
}

export const MembersPage = (props: Props) => {
    const { usersMap } = useUserLookupContext()
    const members = useMemo(
        () => props.memberIds.map((userId) => usersMap[userId]),
        [props.memberIds, usersMap],
    )
    return members?.length ? (
        <CentralPanelLayout>
            <Stack height="100%">
                <Stack borderBottom horizontal paddingX="lg" minHeight="x8" alignItems="center">
                    <Paragraph strong size="lg">
                        Members
                    </Paragraph>
                </Stack>
                <Stack grow overflowY="scroll">
                    <Grid padding="lg" columnMinSize="180px">
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
    const { memberIds } = useSpaceMembers()
    const { usersMap } = useUserLookupContext()
    const members = memberIds.map((m) => usersMap[m])
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

    return (
        <LinkedContainer to={link}>
            <Stack centerContent gap padding>
                <Stack gap grow maxWidth="100%">
                    <Box centerContent>
                        <Avatar
                            size="avatar_x15"
                            userId={member.userId ?? ''}
                            imageVariant="thumbnail300"
                        />
                    </Box>

                    <Box tooltip={getPrettyDisplayName(member).initialName}>
                        <Paragraph truncate textAlign="center">
                            {getPrettyDisplayName(member).initialName}
                        </Paragraph>
                    </Box>
                </Stack>
                {accountAddress && accountAddress && (
                    <ClipboardCopy
                        label={shortAddress(accountAddress)}
                        clipboardContent={accountAddress}
                    />
                )}
            </Stack>
        </LinkedContainer>
    )
}

const LinkedContainer = ({ to, children }: { to?: string; children?: React.ReactNode }) => {
    return to ? <Link to={to}>{children}</Link> : <>{children}</>
}
