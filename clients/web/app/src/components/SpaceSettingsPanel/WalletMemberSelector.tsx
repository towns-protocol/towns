import React, { useCallback, useMemo } from 'react'
import { firstBy } from 'thenby'
import { Address, LookupUser, useOfflineStore, useUserLookupContext } from 'use-towns-client'
import { isAddress } from 'ethers/lib/utils'
import { Avatar } from '@components/Avatar/Avatar'
import { Box, IconButton, Stack, Text } from '@ui'
import { useRecentUsers } from 'hooks/useRecentUsers'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { PillSelector } from '@components/DirectMessages/CreateDirectMessage/PillSelector'
import { shortAddress } from 'ui/utils/utils'
import { isEveryoneAddress } from '@components/Web3/utils'
import { useDevice } from 'hooks/useDevice'
import {
    LookupUserWithAbstractAccountAddress,
    useLookupUsersWithAbstractAccountAddress,
} from 'hooks/useAbstractAccountAddress'
import { NoMatches } from '@components/NoMatches/NoMatches'
import { SearchInputHeightAdjuster } from '@components/SpaceSettingsPanel/SearchInputHeightAdjuster'

const CUSTOM_USER_ADDRESS = 'CUSTOM_USER_ADDRESS'

type Props = {
    value: Set<Address>
    onChange: (addresses: Set<Address>) => void
    isValidationError: boolean
}

export const WalletMemberSelector = (props: Props) => {
    const { value, onChange, isValidationError } = props
    const { lookupUser } = useUserLookupContext()
    const { data: _users, isLoading } = useLookupUsersWithAbstractAccountAddress()
    const { isTouch } = useDevice()

    const recentUsers = useRecentUsers()
    const users = useMemo(() => {
        if (isLoading || !_users) {
            return []
        }
        return _users.filter((user) => !isEveryoneAddress(user.userId))
    }, [_users, isLoading])

    const onSelectionChange = useCallback(
        (userIds: Set<string>) => {
            onChange(userIds as Set<Address>)
        },
        [onChange],
    )

    const optionSorter = useCallback(
        (options: LookupUserWithAbstractAccountAddress[]) =>
            [...options].sort(
                firstBy<LookupUserWithAbstractAccountAddress>(
                    (u) => [...recentUsers].reverse().indexOf(u.userId),
                    -1,
                ).thenBy((id) => lookupUser(id.userId)?.displayName),
            ),
        [recentUsers, lookupUser],
    )

    const optionRenderer = useCallback(
        ({
            option,
            selected,
            onAddItem,
        }: {
            option: LookupUserWithAbstractAccountAddress
            selected: boolean
            onAddItem: (customKey?: string) => void
        }) => (
            <Box
                cursor="pointer"
                onClick={() => {
                    onAddItem()
                }}
            >
                <UserOption key={option.userId} user={option} selected={selected} />
            </Box>
        ),
        [],
    )

    return (
        <Stack gap data-testid="user-search">
            <SearchInputHeightAdjuster>
                {(inputContainerRef) => (
                    <PillSelector
                        hideResultsWhenNotActive
                        autoFocus={false}
                        options={users}
                        isError={isValidationError}
                        initialFocusIndex={isTouch ? -1 : 0}
                        initialSelection={value}
                        keys={['username', 'displayName', 'abstractAccountAddress']}
                        label="Suggested"
                        placeholder={
                            !value.size ? 'Search members' : value.size >= 1 ? 'Add members' : ''
                        }
                        optionRenderer={optionRenderer}
                        pillRenderer={(p) => (
                            <PillRenderer
                                address={p.key}
                                lookupUser={lookupUser}
                                onDelete={p.onDelete}
                            />
                        )}
                        optionSorter={optionSorter}
                        getOptionKey={(o) => o.abstractAccountAddress}
                        emptySelectionElement={(props) => <EmptySelectionElement {...props} />}
                        inputContainerRef={inputContainerRef}
                        onSelectionChange={onSelectionChange}
                    />
                )}
            </SearchInputHeightAdjuster>
        </Stack>
    )
}

function PillRenderer(params: {
    address: string
    lookupUser: (userId: string) => LookupUser | undefined
    onDelete: (customKey?: string) => void
}) {
    const { address: aaAddress, lookupUser, onDelete } = params
    const offlineWalletAddressMap = useOfflineStore((state) => state.offlineWalletAddressMap)

    // need to get root key for avatar and username
    const rootKeyAddress = Object.keys(offlineWalletAddressMap).find(
        (key) => offlineWalletAddressMap[key] === aaAddress,
    )
    const everyone = isEveryoneAddress(aaAddress)

    const rootKeyUser = rootKeyAddress ? lookupUser(rootKeyAddress) : undefined

    return (
        <Box
            horizontal
            gap="sm"
            paddingX="sm"
            paddingY="xs"
            background="level3"
            rounded="md"
            alignItems="center"
            data-testid={`user-pill-selector-pill-${aaAddress}`}
        >
            <Avatar size="avatar_xs" userId={rootKeyAddress} />

            {rootKeyAddress && rootKeyUser && getPrettyDisplayName(rootKeyUser)}
            {aaAddress && (
                <Box
                    whiteSpace="nowrap"
                    tooltip={aaAddress}
                    fontSize="sm"
                    color={everyone ? 'default' : 'gray2'}
                >
                    {shortAddress(aaAddress)}
                </Box>
            )}

            <IconButton
                data-testid={`user-pill-delete-${aaAddress}`}
                icon="close"
                size="square_xs"
                onClick={() => {
                    onDelete()
                }}
            />
        </Box>
    )
}

export const UserOption = (props: {
    user: LookupUserWithAbstractAccountAddress
    selected: boolean
}) => {
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
            data-testid={`user-pill-selector-option-${user.userId}`}
        >
            <Avatar size="avatar_x4" userId={isCustomUserAddress ? undefined : user.userId} />
            <Box justifyContent="center" gap="sm">
                {!isCustomUserAddress && <Text>{getPrettyDisplayName(user)}</Text>}

                {user.abstractAccountAddress && (
                    <Box tooltip={user.abstractAccountAddress} color="gray2">
                        {shortAddress(user.abstractAccountAddress)}
                    </Box>
                )}
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
                            abstractAccountAddress: searchTerm as Address,
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

    return <NoMatches searchTerm={searchTerm} />
}
