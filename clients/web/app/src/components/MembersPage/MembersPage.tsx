import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Address, RoomMember, useSpaceMembers, useUserLookupContext } from 'use-zion-client'
import { CentralPanelLayout } from 'routes/layouts/CentralPanelLayout'
import { shortAddress } from 'ui/utils/utils'
import { Box, Grid, Paragraph, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useCreateLink } from 'hooks/useCreateLink'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Avatar } from '@components/Avatar/Avatar'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useDevice } from 'hooks/useDevice'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

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
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: member.userId as Address | undefined,
    })
    const { createLink } = useCreateLink()
    const link = createLink({ profileId: abstractAccountAddress })
    const { isTouch } = useDevice()

    return (
        <LinkedContainer to={link}>
            <Stack
                centerContent
                gap
                padding
                background="level1"
                tooltip={!isTouch ? <ProfileHoverCard userId={member.userId} /> : undefined}
            >
                <Stack gap grow maxWidth="100%">
                    <Box position="relative">
                        <Avatar
                            size="avatar_x15"
                            userId={member.userId ?? ''}
                            imageVariant="thumbnail300"
                        />
                    </Box>

                    <Box tooltip={getPrettyDisplayName(member)}>
                        <Paragraph truncate textAlign="center">
                            {getPrettyDisplayName(member)}
                        </Paragraph>
                    </Box>
                </Stack>
                {abstractAccountAddress && (
                    <ClipboardCopy
                        label={shortAddress(abstractAccountAddress)}
                        clipboardContent={abstractAccountAddress}
                    />
                )}
            </Stack>
        </LinkedContainer>
    )
}

const LinkedContainer = ({ to, children }: { to?: string; children?: React.ReactNode }) => {
    return to ? <Link to={to}>{children}</Link> : <>{children}</>
}
