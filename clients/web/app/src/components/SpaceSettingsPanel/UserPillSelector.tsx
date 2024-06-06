import React, { useCallback, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import { Address, LookupUserMap, useOfflineStore, useUserLookupContext } from 'use-towns-client'
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
import {
    LookupUserWithAbstractAccountAddress,
    useLookupUsersWithAbstractAccountAddress,
} from 'hooks/useAbstractAccountAddress'

const CUSTOM_USER_ADDRESS = 'CUSTOM_USER_ADDRESS'

type Props = {
    initialSelection: Set<Address>
    inputContainerRef: React.RefObject<HTMLDivElement>
    onSelectionChange: (addresses: Set<Address>) => void
    isValidationError: boolean
}

const everyoneUser: LookupUserWithAbstractAccountAddress = {
    userId: EVERYONE_ADDRESS,
    abstractAccountAddress: EVERYONE_ADDRESS,
    username: 'Everyone',
    usernameConfirmed: false,
    usernameEncrypted: false,
    displayName: 'Everyone',
    displayNameEncrypted: false,
}

export const UserPillSelector = (props: Props) => {
    const { onSelectionChange: onSelectionChangeProp, isValidationError } = props
    const { usersMap } = useUserLookupContext()
    const { data: _users, isLoading } = useLookupUsersWithAbstractAccountAddress()
    const { isTouch } = useDevice()

    const recentUsers = useRecentUsers()
    const users = useMemo(() => {
        if (isLoading || !_users) {
            return []
        }
        return [everyoneUser].concat(_users)
    }, [_users, isLoading])

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
        (options: LookupUserWithAbstractAccountAddress[]) =>
            [...options].sort(
                firstBy<LookupUserWithAbstractAccountAddress>(
                    (u) => [...recentUsers].reverse().indexOf(u.userId),
                    -1,
                ).thenBy((id) => usersMap[id]?.displayName),
            ),
        [recentUsers, usersMap],
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

    return (
        <PillSelector
            hideResultsWhenNotActive
            autoFocus={false}
            options={users}
            isError={isValidationError}
            initialFocusIndex={isTouch ? -1 : 0}
            initialSelection={props.initialSelection}
            keys={['username', 'displayName', 'abstractAccountAddress']}
            label="Suggested"
            placeholder={!numSelected ? 'Search people' : numSelected === 1 ? 'Add people...' : ''}
            optionRenderer={optionRenderer}
            pillRenderer={(p) => (
                <PillRenderer address={p.key} usersMap={usersMap} onDelete={p.onDelete} />
            )}
            optionSorter={optionSorter}
            getOptionKey={(o) => o.abstractAccountAddress}
            emptySelectionElement={(props) => <EmptySelectionElement {...props} />}
            inputContainerRef={props.inputContainerRef}
            onSelectionChange={onSelectionChange}
            // onConfirm={props.onConfirm}
            // onPreviewChange={props.onUserPreviewChange}
        />
    )
}

function PillRenderer(params: {
    address: string
    usersMap: LookupUserMap
    onDelete: (customKey?: string) => void
}) {
    const { address: aaAddress, usersMap, onDelete } = params
    const offlineWalletAddressMap = useOfflineStore((state) => state.offlineWalletAddressMap)

    // need to get root key for avatar and username
    const rootKeyAddress = Object.keys(offlineWalletAddressMap).find(
        (key) => offlineWalletAddressMap[key] === aaAddress,
    )
    const everyone = isEveryoneAddress(aaAddress)

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
            {everyone ? (
                <Avatar size="avatar_xs" icon="people" iconSize="square_xs" />
            ) : (
                <Avatar size="avatar_xs" userId={rootKeyAddress} />
            )}

            {rootKeyAddress &&
                usersMap[rootKeyAddress] &&
                getPrettyDisplayName(usersMap[rootKeyAddress])}
            <Box
                whiteSpace="nowrap"
                tooltip={everyone ? 'All wallet addresses' : aaAddress}
                fontSize="sm"
                color={everyone ? 'default' : 'gray2'}
            >
                {everyone ? <Text>Everyone</Text> : aaAddress && shortAddress(aaAddress)}
            </Box>

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
        >
            {isEveryoneAddress(user.userId) ? (
                <Avatar size="avatar_x4" icon="people" />
            ) : (
                <Avatar size="avatar_x4" userId={isCustomUserAddress ? undefined : user.userId} />
            )}
            <Box justifyContent="center" gap="sm">
                {!isCustomUserAddress && <Text>{getPrettyDisplayName(user)}</Text>}

                <Box
                    tooltip={
                        isEveryoneAddress(user.abstractAccountAddress)
                            ? undefined
                            : user.abstractAccountAddress
                    }
                    color="gray2"
                >
                    {isEveryoneAddress(user.abstractAccountAddress)
                        ? 'All wallet addresses'
                        : shortAddress(user.abstractAccountAddress)}
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
