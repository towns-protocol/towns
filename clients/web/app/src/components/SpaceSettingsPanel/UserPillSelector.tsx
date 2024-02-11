import React, { useCallback, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import { Address, LookupUser, useMyUserId, useUserLookupContext } from 'use-zion-client'
import { isAddress } from 'ethers/lib/utils'
import { Avatar } from '@components/Avatar/Avatar'
import { Box, Icon, IconButton, Paragraph, Text } from '@ui'
import { useRecentUsers } from 'hooks/useRecentUsers'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { PillSelector } from '@components/DirectMessages/CreateDirectMessage/PillSelector'
import { shortAddress } from 'ui/utils/utils'
import { EVERYONE_ADDRESS } from 'utils'
import { isEveryoneAddress } from '@components/Web3/utils'
import { useDevice } from 'hooks/useDevice'

const CUSTOM_USER_ADDRESS = 'CUSTOM_USER_ADDRESS'

type Props = {
    initialSelection: Set<Address>
    inputContainerRef: React.RefObject<HTMLDivElement>
    onSelectionChange: (addresses: Set<Address>) => void
    isValidationError: boolean
}

const everyoneUser: LookupUser = {
    userId: EVERYONE_ADDRESS,
    username: 'Everyone',
    usernameConfirmed: false,
    usernameEncrypted: false,
    displayName: 'Everyone',
    displayNameEncrypted: false,
}

export const UserPillSelector = (props: Props) => {
    const { onSelectionChange: onSelectionChangeProp, isValidationError } = props
    const { users: _users, usersMap } = useUserLookupContext()
    const { isTouch } = useDevice()

    const recentUsers = useRecentUsers()
    const userId = useMyUserId()
    const users = useMemo(() => {
        return [everyoneUser].concat(_users.filter((u) => u.userId !== userId))
    }, [_users, userId])

    // -------------------------------------------------------------------------
    const [selectedAddresses, setSelectedAddresses] = useState(() => new Set<string>())

    const numSelected = selectedAddresses.size

    const onSelectionChange = useCallback(
        (userIds: Set<string>) => {
            setSelectedAddresses(userIds)
            onSelectionChangeProp(userIds as Set<Address>)
        },
        [onSelectionChangeProp],
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
        ({
            option,
            selected,
            onAddItem,
        }: {
            option: LookupUser
            selected: boolean
            onAddItem: (customKey?: string) => void
        }) => (
            <Box
                cursor="pointer"
                data-testid={`user-pill-selector-option-${option.userId}`}
                onClick={() => {
                    onAddItem()
                }}
            >
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
                data-testid={`user-pill-selector-pill-${params.key}`}
            >
                {isEveryoneAddress(params.key) ? (
                    <Avatar size="avatar_xs" icon="people" iconSize="square_xs" />
                ) : (
                    <Avatar size="avatar_xs" userId={params.key} />
                )}

                {usersMap[params.key] && getPrettyDisplayName(usersMap[params.key])}
                <Box
                    whiteSpace="nowrap"
                    tooltip={isEveryoneAddress(params.key) ? 'All wallet addresses' : params.key}
                    fontSize="sm"
                    color={isEveryoneAddress(params.key) ? 'default' : 'gray2'}
                >
                    {isEveryoneAddress(params.key) ? (
                        <Text>Everyone</Text>
                    ) : (
                        shortAddress(params.key)
                    )}
                </Box>

                <IconButton
                    data-testid={`user-pill-delete-${params.key}`}
                    icon="close"
                    size="square_xs"
                    onClick={() => {
                        params.onDelete()
                    }}
                />
            </Box>
        ),
        [usersMap],
    )

    return (
        <PillSelector
            hideResultsWhenNotActive
            autoFocus={false}
            options={users}
            isError={isValidationError}
            initialFocusIndex={isTouch ? -1 : 0}
            // userId is address, and what we need to send to contract
            // TODO: will we need to get the AA account instead?
            initialSelection={props.initialSelection}
            keys={['username', 'displayName', 'userId']}
            label="Suggested"
            placeholder={!numSelected ? 'Search people' : numSelected === 1 ? 'Add people...' : ''}
            optionRenderer={optionRenderer}
            pillRenderer={pillRenderer}
            optionSorter={optionSorter}
            getOptionKey={(o) => o.userId}
            emptySelectionElement={(props) => <EmptySelectionElement {...props} />}
            inputContainerRef={props.inputContainerRef}
            onSelectionChange={onSelectionChange}
            // onConfirm={props.onConfirm}
            // onPreviewChange={props.onUserPreviewChange}
        />
    )
}

export const UserOption = (props: { user: LookupUser; selected: boolean }) => {
    const { selected, user } = props
    const isCustomUserAddress = user.displayName === CUSTOM_USER_ADDRESS
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
            {isEveryoneAddress(user.userId) ? (
                <Avatar size="avatar_x4" icon="people" />
            ) : (
                <Avatar size="avatar_x4" userId={isCustomUserAddress ? undefined : user.userId} />
            )}
            <Box justifyContent="center" gap="sm">
                {!isCustomUserAddress && <Text>{getPrettyDisplayName(user)}</Text>}

                <Box
                    tooltip={isEveryoneAddress(user.userId) ? undefined : user.userId}
                    color="gray2"
                >
                    {isEveryoneAddress(user.userId)
                        ? 'All wallet addresses'
                        : shortAddress(user.userId)}
                </Box>
            </Box>
        </Box>
    )
}

function EmptySelectionElement({
    searchTerm,
    onAddItem,
}: {
    searchTerm: string
    onAddItem: (specialKey: string) => void
}) {
    if (!searchTerm.length) {
        return <></>
    }

    if (isAddress(searchTerm)) {
        return (
            <Box
                padding
                horizontal
                gap="sm"
                background="level2"
                height="x7"
                alignItems="center"
                rounded="sm"
                boxShadow="card"
            >
                <Box cursor="pointer" onClick={() => onAddItem(searchTerm)}>
                    <UserOption
                        selected
                        key={searchTerm}
                        user={{
                            userId: searchTerm,
                            username: searchTerm,
                            usernameConfirmed: false,
                            usernameEncrypted: false,
                            displayName: CUSTOM_USER_ADDRESS,
                            displayNameEncrypted: false,
                        }}
                    />
                </Box>
            </Box>
        )
    }

    return (
        <Box
            padding
            horizontal
            gap="sm"
            background="level2"
            height="x7"
            alignItems="center"
            rounded="sm"
            color="gray2"
            boxShadow="card"
        >
            <Icon type="alert" size="square_xs" />
            <Paragraph>No matches for &quot;{searchTerm}&quot;</Paragraph>
        </Box>
    )
}
