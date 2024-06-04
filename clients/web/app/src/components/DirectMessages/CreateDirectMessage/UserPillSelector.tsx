import React, { CSSProperties, useCallback, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import { LookupUser, useMyUserId, useUserLookupContext } from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import { Box, Button, IconButton, Paragraph, Stack, Text } from '@ui'
import { useRecentUsers } from 'hooks/useRecentUsers'
import { useGetUserBio } from 'hooks/useUserBio'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useDevice } from 'hooks/useDevice'
import { lookupUserNameSearchString } from 'hooks/useSearch'
import { PillSelector } from './PillSelector'

type Props = {
    disabled?: boolean
    onSelectionChange: (users: Set<string>) => void
    emptySelectionElement?: (params: { searchTerm: string }) => JSX.Element
    onConfirm: () => void
    onUserPreviewChange?: (previewItem: LookupUser | undefined) => void
}

export const UserPillSelector = (props: Props) => {
    const { disabled = false } = props
    const { users: _users, usersMap } = useUserLookupContext()
    const recentUsers = useRecentUsers()

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

    const userId = useMyUserId()
    const users = useMemo(() => {
        return (
            _users
                // only allow selecting self if selection is empty
                .filter((u) => numSelected === 0 || u.userId !== userId)
                .map((user: LookupUser) => {
                    return { ...user, search: lookupUserNameSearchString(user) }
                }) as LookupUser[]
        )
    }, [_users, numSelected, userId])

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
        ({
            option,
            selected,
            onAddItem,
        }: {
            option: LookupUser
            selected: boolean
            onAddItem: (customKey?: string) => void
        }) => (
            <Box cursor="pointer" onClick={() => onAddItem()}>
                <UserOption key={option.userId} user={option} selected={selected} />
            </Box>
        ),
        [],
    )

    const pillRenderer = useCallback(
        (params: { key: string; onDelete: (customKey?: string) => void }) => (
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
                <IconButton icon="close" size="square_xs" onClick={() => params.onDelete()} />
            </Box>
        ),
        [usersMap],
    )

    const showSuggestions = numSelected < 2

    const { isTouch } = useDevice()

    const createMessageButton =
        isTouch && numSelected === 1 ? (
            <Box>
                <Button onClick={props.onConfirm}>
                    Message {getPrettyDisplayName(usersMap[selectedIdsArray?.[0]])}
                </Button>
            </Box>
        ) : undefined

    const label = showSuggestions ? 'Suggested' : 'Add people'

    const labelElement = (
        <>
            {createMessageButton}
            <Box>
                <Paragraph color="gray2">{label}</Paragraph>
            </Box>
        </>
    )

    return (
        <Stack absoluteFill pointerEvents="none" zIndex="layer" style={preventGlitchStyle}>
            <Box gap paddingTop="md" paddingX="md" pointerEvents="auto" position="relative">
                {/* backdrop */}
                <Box absoluteFill paddingBottom="sm" zIndex="below">
                    <Box grow background="level1" />
                </Box>
                {/* needed to cover backdrop */}
                <Box zIndex="layer">
                    <PillSelector
                        hideResultsWhenNotActive={disabled}
                        options={users}
                        keys={['search']}
                        label={labelElement}
                        initialFocusIndex={isTouch ? -1 : 0}
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

// fixes: mobile layer dissappears in some cases when adding people
const preventGlitchStyle: CSSProperties = { transform: `translate3d(0,0,0)` }
