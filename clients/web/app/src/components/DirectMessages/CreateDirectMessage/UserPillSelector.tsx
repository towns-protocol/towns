import React, { useCallback, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import { LookupUser, useMyUserId, useUserLookupContext } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { Box, IconButton, Paragraph, Stack, Text } from '@ui'
import { useRecentUsers } from 'hooks/useRecentUsers'
import { useGetUserBio } from 'hooks/useUserBio'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { PillSelector } from './PillSelector'

type Props = {
    onSelectionChange: (users: Set<string>) => void
    emptySelectionElement?: (params: { searchTerm: string }) => JSX.Element
    onConfirm: () => void
    onUserPreviewChange?: (previewItem: LookupUser | undefined) => void
}

export const UserPillSelector = (props: Props) => {
    const { users: _users, usersMap } = useUserLookupContext()
    const recentUsers = useRecentUsers()
    const userId = useMyUserId()
    const users = useMemo(() => {
        return _users.filter((u) => u.userId !== userId)
    }, [_users, userId])

    // -------------------------------------------------------------------------

    const [selectedIds, setSelectedIds] = useState(() => new Set<string>())
    const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds])
    const numSelected = selectedIdsArray.length

    const onSelectionChange = useCallback(
        (userIds: Set<string>) => {
            setSelectedIds(userIds)
            props.onSelectionChange(userIds)
        },
        [props],
    )

    // -------------------------------------------------------------------------

    const optionSorter = useCallback(
        (options: LookupUser[]) =>
            [...options].sort(
                firstBy<LookupUser>((u) => [...recentUsers].reverse().indexOf(u.userId), -1).thenBy(
                    (id) => usersMap[id]?.displayName,
                ),
            ),
        [recentUsers, usersMap],
    )

    const optionRenderer = useCallback(
        ({ option, selected }: { option: LookupUser; selected: boolean }) => (
            <UserOption key={option.userId} user={option} selected={selected} />
        ),
        [],
    )

    const pillRenderer = useCallback(
        (params: { key: string; onDelete: () => void }) => (
            <Box
                horizontal
                gap="sm"
                paddingX="sm"
                paddingY="xs"
                background="level3"
                rounded="md"
                alignItems="center"
            >
                <Avatar size="avatar_xs" userId={params.key} />
                <Paragraph whiteSpace="nowrap">
                    {getPrettyDisplayName(usersMap[params.key])}
                </Paragraph>
                <IconButton icon="close" size="square_xs" onClick={params.onDelete} />
            </Box>
        ),
        [usersMap],
    )

    return (
        <Stack absoluteFill pointerEvents="none" zIndex="layer">
            <Box gap paddingTop="md" paddingX="md" pointerEvents="auto" position="relative">
                {/* backdrop */}
                <Box absoluteFill paddingBottom="sm" zIndex="below">
                    <Box grow background="level1" />
                </Box>
                {/* needed to cover backdrop */}
                <Box zIndex="layer">
                    <PillSelector
                        options={users}
                        keys={['username', 'displayName']}
                        label={!numSelected ? 'Suggested' : 'Add people'}
                        placeholder={
                            !numSelected
                                ? 'Search for people or channels'
                                : numSelected === 1
                                ? 'Add people...'
                                : ''
                        }
                        optionRenderer={optionRenderer}
                        pillRenderer={pillRenderer}
                        optionSorter={optionSorter}
                        getOptionKey={(o) => o.userId}
                        emptySelectionElement={props.emptySelectionElement}
                        onSelectionChange={onSelectionChange}
                        onConfirm={props.onConfirm}
                        onPreviewChange={props.onUserPreviewChange}
                    />
                </Box>
            </Box>
        </Stack>
    )
}

export const UserOption = (props: { user: LookupUser; selected: boolean }) => {
    const { selected, user } = props
    const { data: userBio } = useGetUserBio(user.userId)
    return (
        <Box
            horizontal
            gap
            key={user.userId}
            background={selected ? 'level3' : undefined}
            insetX="xs"
            padding="sm"
            rounded={selected ? 'xs' : undefined}
        >
            <Avatar size="avatar_x4" userId={user.userId} />
            <Box justifyContent="center" gap="sm">
                <Text>{getPrettyDisplayName(user)}</Text>
                {userBio && (
                    <Text color="gray2" size="sm">
                        {userBio}
                    </Text>
                )}
            </Box>
        </Box>
    )
}
