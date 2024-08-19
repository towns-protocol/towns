import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Address, useSpaceMembers, useUserLookupContext } from 'use-towns-client'
import { isDefined } from '@river-build/sdk'
import { shortAddress } from 'ui/utils/utils'
import { Box, CardLabel, Grid, Paragraph, Stack, TextField } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { useCreateLink } from 'hooks/useCreateLink'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Avatar } from '@components/Avatar/Avatar'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useDevice } from 'hooks/useDevice'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { NoMatches } from '@components/NoMatches/NoMatches'
import { useFuzzySearchByProperty } from 'hooks/useFuzzySearchByProperty'

type Props = {
    memberIds: string[]
}

export const MembersPage = (props: Props) => {
    const { lookupUser } = useUserLookupContext()

    const members = useMemo(
        () => props.memberIds.map((userId) => lookupUser(userId)).filter(isDefined),
        [lookupUser, props.memberIds],
    )

    const membersWithNames = useMemo(
        () => members.map((member) => ({ ...member, name: getPrettyDisplayName(member) })),
        [members],
    )

    const {
        searchText,
        filteredItems: filteredMembers,
        handleSearchChange,
    } = useFuzzySearchByProperty(membersWithNames)

    return members?.length ? (
        <Stack height="100%">
            <CardLabel label="Members" />
            <Box padding="md">
                <TextField
                    placeholder="Search members"
                    value={searchText}
                    background="level2"
                    onChange={handleSearchChange}
                />
            </Box>
            <Stack grow overflowY="scroll">
                {filteredMembers.length > 0 ? (
                    <Grid columnMinSize="180px">
                        {filteredMembers.map((member) => (
                            <GridProfile userId={member.userId} key={member.userId} />
                        ))}
                    </Grid>
                ) : (
                    <Box paddingX="md">
                        <NoMatches searchTerm={searchText} />
                    </Box>
                )}
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
