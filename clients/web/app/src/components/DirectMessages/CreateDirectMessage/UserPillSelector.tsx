import React, { CSSProperties, useCallback, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import {
    DMChannelIdentifier,
    LookupUser,
    useMyUserId,
    useSpaceId,
    useSpaceMembersWithFallback,
    useTownsContext,
    useUserLookupContext,
} from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import { Box, Button, IconButton, Paragraph, Stack, Text } from '@ui'
import { useRecentUsers } from 'hooks/useRecentUsers'
import { useGetUserBio } from 'hooks/useUserBio'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useDevice } from 'hooks/useDevice'
import { lookupUserNameSearchString } from 'hooks/useSearch'
import { notUndefined } from 'ui/utils/utils'
import { PillSelector } from './PillSelector'
import { DirectMessageRowContent } from '../DirectMessageListItem'

type Props = {
    disabled?: boolean
    onSelectionChange: (users: Set<string>) => void
    emptySelectionElement?: (params: { searchTerm: string }) => JSX.Element
    onConfirm: () => void
    onUserPreviewChange?: (previewItem: LookupUser | ChannelSearchItem | undefined) => void
    onSelectChannel?: (channelId: string) => void
}

const toSearchItems = (channels: DMChannelIdentifier[]): ChannelSearchItem[] => {
    return channels
        .filter((f) => f.properties?.name)
        .map((channel) => ({
            ...channel,
            type: 'channel-search-item',
            search: channel.properties?.name ?? '',
        }))
}

type ChannelSearchItem = DMChannelIdentifier & { type: 'channel-search-item'; search: string }

const isChannelOption = (option: LookupUser | ChannelSearchItem): option is ChannelSearchItem =>
    typeof option === 'object' && 'type' in option && option.type === 'channel-search-item'

export const UserPillSelector = (props: Props) => {
    const { disabled = false } = props
    const { lookupUser } = useUserLookupContext()
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
    const spaceId = useSpaceId()
    const { memberIds } = useSpaceMembersWithFallback(spaceId)

    const userSuggestions = useMemo(() => {
        return (
            memberIds
                .map((m) => lookupUser(m))
                .filter(notUndefined)
                // only allow selecting self if selection is empty
                .filter((u) => numSelected === 0 || u.userId !== userId)
                .map((user: LookupUser) => {
                    return { ...user, search: lookupUserNameSearchString(user) }
                }) as LookupUser[]
        )
    }, [lookupUser, memberIds, numSelected, userId])

    // -------------------------------------------------------------------------

    const { dmChannels } = useTownsContext()

    const channelSuggestions = useMemo(() => {
        const channels =
            numSelected === 0
                ? dmChannels
                : dmChannels.filter((c) => selectedIdsArray.every((u) => c.userIds.includes(u)))
        return toSearchItems(channels)
    }, [dmChannels, numSelected, selectedIdsArray])

    // -------------------------------------------------------------------------

    const optionSorter = useCallback(
        (options: (LookupUser | ChannelSearchItem)[]) =>
            [...options].sort(
                firstBy<LookupUser | ChannelSearchItem>(
                    (u) => [...recentUsers].reverse().indexOf(isChannelOption(u) ? '' : u.userId),
                    -1,
                ).thenBy((u) =>
                    isChannelOption(u) ? u.properties?.name : lookupUser(u.userId)?.displayName,
                ),
            ),
        [lookupUser, recentUsers],
    )

    const optionRenderer = useCallback(
        ({
            option,
            selected,
            onAddItem,
        }: {
            option: LookupUser | ChannelSearchItem
            selected: boolean
            onAddItem: (customKey?: string) => void
        }) => (
            <Box cursor="pointer" onClick={() => onAddItem()}>
                <UserOrDMOption
                    key={isChannelOption(option) ? option.id : option.userId}
                    data={option}
                    selected={selected}
                />
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
                    {getPrettyDisplayName(lookupUser(params.key))}
                </Paragraph>
                <IconButton icon="close" size="square_xs" onClick={() => params.onDelete()} />
            </Box>
        ),
        [lookupUser],
    )

    const showSuggestions = numSelected < 2

    const { isTouch } = useDevice()

    const ctaElement =
        isTouch && numSelected === 1 ? (
            <Box>
                <Button onClick={props.onConfirm}>
                    Message {getPrettyDisplayName(lookupUser(selectedIdsArray?.[0]))}
                </Button>
            </Box>
        ) : undefined

    const labelElement = (
        <Box>
            <Paragraph color="gray2">{showSuggestions ? 'Suggested' : 'Add people'}</Paragraph>
        </Box>
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
                        options={[...channelSuggestions, ...userSuggestions]}
                        keys={['search']}
                        cta={ctaElement}
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
                        getOptionKey={(o) => (isChannelOption(o) ? o.id : o.userId)}
                        emptySelectionElement={props.emptySelectionElement}
                        onSelectionChange={onSelectionChange}
                        onBeforeOptionAdded={(option) => {
                            if (isChannelOption(option)) {
                                props.onSelectChannel?.(option.id)
                                return false
                            }
                        }}
                        onConfirm={props.onConfirm}
                        onPreviewChange={props.onUserPreviewChange}
                    />
                </Box>
            </Box>
        </Stack>
    )
}

export const UserOrDMOption = (props: {
    data: LookupUser | ChannelSearchItem
    selected: boolean
}) => {
    if (isChannelOption(props.data)) {
        return <ChannelOption dm={props.data} selected={props.selected} />
    } else {
        return <UserOption user={props.data} selected={props.selected} />
    }
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

const ChannelOption = (props: { dm: ChannelSearchItem; selected: boolean }) => {
    const { selected, dm: dm } = props
    return (
        <Box
            horizontal
            gap
            key={dm.id}
            background={selected ? 'level3' : undefined}
            insetX="xs"
            padding="sm"
            rounded={selected ? 'xs' : undefined}
        >
            <DirectMessageRowContent channel={dm} unread={false} />
        </Box>
    )
}

// fixes: mobile layer dissappears in some cases when adding people
const preventGlitchStyle: CSSProperties = { transform: `translate3d(0,0,0)` }
