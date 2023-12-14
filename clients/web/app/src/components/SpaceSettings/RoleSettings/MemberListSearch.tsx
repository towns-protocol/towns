import React, { useMemo } from 'react'
import {
    RoomMember,
    getAccountAddress,
    useSpaceMembers,
    useUserLookupContext,
} from 'use-zion-client'
import { Box, Checkbox, IconButton, MotionBox, Text, TextField } from '@ui'
import { shortAddress } from 'ui/utils/utils'

import { EVERYONE_ADDRESS } from 'utils'
import {
    AddressListSearch,
    SelectedItemsList,
    useTokenSearch,
    useUpdateSelectedItems,
} from '@components/AddressListSearch/AddressListSearch'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { TokenClickParameters } from '@components/Tokens/types'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { Avatar } from '@components/Avatar/Avatar'
type MyRoomMember = Pick<RoomMember, 'userId' | 'name'>

type ResultsWithIdForVList = {
    id: string
    address: string
} & MyRoomMember

export function MemberList({
    initialItems,
    onUpdate,
}: {
    initialItems: string[]
    onUpdate: (items: string[]) => void
}) {
    const { memberIds } = useSpaceMembers()
    const { usersMap } = useUserLookupContext()
    const members = useMemo(
        () => memberIds.map((m) => usersMap[m] ?? { userId: m, name: m, displayName: m }),
        [memberIds, usersMap],
    )

    const membersWithAddress: ResultsWithIdForVList[] = useMemo(() => {
        const mappedMembers = members.map((m) => {
            const address = getAccountAddress(m.userId) ?? ''

            return {
                userId: address,
                name: getPrettyDisplayName(m).displayName,
                address,
                id: address,
            }
        })

        const everyone = {
            id: EVERYONE_ADDRESS,
            address: EVERYONE_ADDRESS,
            userId: EVERYONE_ADDRESS,
            name: 'Everyone',
        }
        return [everyone, ...mappedMembers]
    }, [members])

    const { search, results, setSearch, isCustomAddress } = useTokenSearch<ResultsWithIdForVList>({
        data: membersWithAddress,
    })

    const _initialItems = useMemo(
        () =>
            initialItems.map((i) => ({
                contractAddress: i,
                // token Ids don't apply for user gating
                tokenIds: [],
            })),
        [initialItems],
    )
    const { selectedItems: tokenStructItems, toggleContract } = useUpdateSelectedItems({
        initialItems: _initialItems,
        onUpdate: (items) => {
            const _items = items.map(toAddress)
            onUpdate(_items)
        },
    })

    const noResults = !results.length && !isCustomAddress

    return (
        <>
            <SelectedItemsList items={tokenStructItems}>
                {({ item }) => {
                    const member = membersWithAddress.find((m) => m.address === item)
                    return (
                        <SelectedMemberItem
                            address={item}
                            member={member}
                            onClick={toggleContract}
                        />
                    )
                }}
            </SelectedItemsList>
            <MotionBox layout="position">
                <TextField
                    data-testid="member-search"
                    background="level2"
                    placeholder="Search"
                    onChange={(e) => setSearch(e.target.value)}
                />
            </MotionBox>
            {isCustomAddress ? (
                <Box padding="md" background="level3" rounded="sm">
                    <Checkbox
                        name="tokens"
                        width="100%"
                        value={search}
                        label={
                            <MemberCheckboxLabel
                                userId=""
                                contractAddress={search}
                                label="Add user"
                            />
                        }
                        checked={tokenStructItems.map(toAddress).includes(search)}
                        onChange={() => toggleContract({ contractAddress: search, tokenIds: [] })}
                    />
                </Box>
            ) : (
                <AddressListSearch
                    listMaxHeight="300"
                    noResults={noResults}
                    noResultsText="No members found."
                    data={results}
                    itemRenderer={(data) => (
                        <MemberCheckbox
                            item={data}
                            selectedItems={tokenStructItems.map(toAddress)}
                            onItemClick={(address) =>
                                toggleContract({ contractAddress: address, tokenIds: [] })
                            }
                        />
                    )}
                />
            )}
        </>
    )
}

function toAddress(params: TokenDataStruct) {
    return params.contractAddress
}

function MemberCheckboxLabel({
    label,
    contractAddress,
    userId,
}: {
    userId: string
    label: string
    contractAddress: string
}) {
    const isEveryoneAddress = contractAddress === EVERYONE_ADDRESS
    return (
        <Box flexDirection="row" alignItems="center" paddingY="sm">
            {isEveryoneAddress ? <Avatar icon="people" /> : <Avatar userId={userId} />}
            <Box paddingX="md">
                <Text>{isEveryoneAddress ? 'Everyone' : label}</Text>
            </Box>
            <Text color="gray2">
                {isEveryoneAddress ? 'All wallet addresses' : shortAddress(contractAddress)}
            </Text>
        </Box>
    )
}

function SelectedMemberItem({
    member,
    address,
    onClick,
}: {
    address: string
    member: MyRoomMember | undefined
    onClick: (args: TokenClickParameters, e: React.MouseEvent<HTMLElement>) => void
}) {
    const isEveryoneAddress = address === EVERYONE_ADDRESS

    return (
        <Box centerContent gap="sm">
            <Box position="relative">
                {isEveryoneAddress ? <Avatar icon="people" /> : <Avatar userId={address} />}
                <IconButton
                    style={{
                        top: '-10%',
                        right: '-10%',
                    }}
                    top="none"
                    right="none"
                    rounded="full"
                    translate="yes"
                    size="square_xxs"
                    position="absolute"
                    icon="close"
                    background="level4"
                    border="faint"
                    color="default"
                    onClick={(e) => onClick({ contractAddress: address, tokenIds: [] }, e)}
                />
            </Box>
            <Text size="sm">{member?.name ? member.name : shortAddress(address)}</Text>
        </Box>
    )
}

function MemberCheckbox({
    item,
    onItemClick,
    selectedItems,
}: {
    item: ResultsWithIdForVList
    onItemClick: (address: string) => void
    selectedItems: string[]
}) {
    return (
        <Box key={item.userId} paddingX="sm">
            <Checkbox
                name="tokens"
                width="100%"
                value={item.address}
                label={
                    <MemberCheckboxLabel
                        userId={item.userId}
                        contractAddress={item.address ?? ''}
                        label={item.name}
                    />
                }
                checked={selectedItems.includes(item.address)}
                onChange={() => onItemClick(item.address)}
            />
        </Box>
    )
}
