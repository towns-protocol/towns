import React, { useMemo } from 'react'
import {
    LookupUser,
    useContractSpaceInfo,
    useMultipleRoleDetails,
    useOfflineStore,
    useRoles,
    useSpaceId,
    useSpaceMembers,
    useUserLookupArray,
} from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { useFuzzySearchByProperty } from 'hooks/useFuzzySearchByProperty'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Box, Paragraph, Stack, TextField } from '@ui'
import { NoMatches } from '@components/NoMatches/NoMatches'
import { Avatar } from '@components/Avatar/Avatar'
import { shortAddress } from 'ui/utils/utils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { isModeratorPermission } from '@components/Web3/utils'

export const TownMembersPanel = () => {
    const { memberIds } = useSpaceMembers()

    return (
        <Panel label={`${memberIds.length} Members`} padding="none">
            <TownMembers memberIds={memberIds} />
        </Panel>
    )
}

const TownMembers = (props: { memberIds: string[] }) => {
    const spaceId = useSpaceId()

    const lookupUsers = useUserLookupArray(props.memberIds)

    const { searchText, filteredItems, handleSearchChange } = useFuzzySearchByProperty(
        lookupUsers,
        'username',
    )

    const { data: contractSpaceInfo } = useContractSpaceInfo(spaceId)
    const owner = contractSpaceInfo?.owner

    const { spaceRoles } = useRoles(spaceId ?? '')

    const { data: roles } = useMultipleRoleDetails(
        spaceId ?? '',
        spaceRoles?.map((role) => role.roleId) ?? [],
    )

    const moderatorRoles = useMemo(() => {
        return roles?.filter((role) =>
            role.permissions.some((permission) => isModeratorPermission(permission)),
        )
    }, [roles])

    const { offlineWalletAddressMap } = useOfflineStore()

    const groups = useMemo(() => {
        return filteredItems.reduce<{
            [key: string]: { title: React.ReactNode; users: LookupUser[] }
        }>(
            (groups, u) => {
                const abstractAccount = offlineWalletAddressMap[u.userId]
                if (abstractAccount && abstractAccount === owner) {
                    groups.owner.users.push(u)
                } else if (
                    abstractAccount &&
                    moderatorRoles?.some((r) => r.users.includes(abstractAccount))
                ) {
                    groups.admins.users.push(u)
                } else {
                    groups.members.users.push(u)
                }
                return groups
            },
            {
                owner: {
                    title: (
                        <Paragraph color="rainbow" alignSelf="start">
                            Founder
                        </Paragraph>
                    ),
                    users: [],
                },
                admins: {
                    title: <Paragraph color="cta2">Admin</Paragraph>,
                    users: [],
                },
                members: {
                    title: <Paragraph color="gray2">Member</Paragraph>,
                    users: [],
                },
            },
        )
    }, [filteredItems, moderatorRoles, offlineWalletAddressMap, owner])

    const { openPanel } = usePanelActions()

    const onOpenProfile = (profileId: string) => {
        openPanel('profile', { profileId })
    }

    return (
        <Stack padding minHeight="forceScroll" gap="md">
            <Box position="sticky" top="md" zIndex="above">
                <TextField
                    background="level2"
                    placeholder="Search members"
                    value={searchText}
                    onChange={handleSearchChange}
                />
            </Box>
            <Box grow gap>
                {Object.entries(groups).map(([id, { title, users }]) => {
                    if (users.length === 0) {
                        return null
                    }
                    return (
                        <Stack gap="md" key={id}>
                            {title}
                            <Stack gap="sm" key={id}>
                                {users.map((user) => (
                                    <Stack
                                        horizontal
                                        hoverable
                                        borderRadius="xs"
                                        background="level1"
                                        key={user.userId}
                                        gap="sm"
                                        padding="sm"
                                        insetX="xs"
                                        insetY="xxs"
                                        cursor="pointer"
                                        onClick={() => {
                                            onOpenProfile(offlineWalletAddressMap[user.userId])
                                        }}
                                    >
                                        <Box>
                                            <Avatar userId={user.userId} size="avatar_x4" />
                                        </Box>
                                        <Box grow gap="sm">
                                            <Paragraph>{getPrettyDisplayName(user)}</Paragraph>
                                            <Paragraph color="gray2">
                                                {shortAddress(user.userId)}
                                            </Paragraph>
                                        </Box>
                                    </Stack>
                                ))}
                            </Stack>
                        </Stack>
                    )
                })}
                {filteredItems.length === 0 && <NoMatches searchTerm={searchText} />}
            </Box>
        </Stack>
    )
}
