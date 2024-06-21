import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Address, useSpaceMembers, useUserLookupContext } from 'use-towns-client'
import { isDefined } from '@river-build/sdk'
import { shortAddress } from 'ui/utils/utils'
import { Box, CardLabel, Grid, Paragraph, Stack } from '@ui'
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
    const { lookupUser } = useUserLookupContext()
    const members = useMemo(
        () => props.memberIds.map((userId) => lookupUser(userId)).filter(isDefined),
        [lookupUser, props.memberIds],
    )
    return members?.length ? (
        <Stack height="100%">
            <CardLabel label="Members" />

            <Stack grow overflowY="scroll">
                <Grid columnMinSize="180px">
                    {props.memberIds.map((userId) => (
                        <GridProfile userId={userId} key={userId} />
                    ))}
                </Grid>
            </Stack>
        </Stack>
    ) : (
        <></>
    )
}

export const MembersPageTouchModal = (props: { onHide: () => void }) => {
    const { memberIds } = useSpaceMembers()
    return (
        <ModalContainer touchTitle="Members" onHide={props.onHide}>
            <Stack grow>
                <Grid columnMinSize="130px">
                    {memberIds.map((userId) => (
                        <GridProfile userId={userId} key={userId} />
                    ))}
                </Grid>
            </Stack>
        </ModalContainer>
    )
}

const GridProfile = ({ userId }: { userId: string }) => {
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address | undefined,
    })
    const { lookupUser } = useUserLookupContext()
    const { createLink } = useCreateLink()
    const link = createLink({ profileId: abstractAccountAddress })
    const { isTouch } = useDevice()
    const user = lookupUser(userId)

    return (
        <LinkedContainer to={link}>
            <Stack
                centerContent
                gap
                padding
                background="level1"
                tooltip={!isTouch ? <ProfileHoverCard userId={userId} /> : undefined}
            >
                <Stack
                    gap
                    grow
                    maxWidth="100%"
                    style={{
                        alignItems: 'center',
                    }}
                >
                    <Box position="relative">
                        <Avatar
                            size="avatar_x15"
                            userId={userId ?? ''}
                            imageVariant="thumbnail300"
                        />
                    </Box>

                    <Box tooltip={getPrettyDisplayName(user)} maxWidth="100%">
                        <Paragraph truncate textAlign="center">
                            {getPrettyDisplayName(user)}
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
