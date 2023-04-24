import React, { useMemo } from 'react'
import { RoomMember } from 'matrix-js-sdk'
import { createUserIdFromString, useSpaceMembers } from 'use-zion-client'
import { Avatar, Box, Checkbox, IconButton, MotionBox, Text, TextField } from '@ui'
import { shortAddress } from 'ui/utils/utils'

import { EVERYONE_ADDRESS } from 'utils'
import {
    AddressListSearch,
    SelectedItemsList,
    useTokenSearch,
    useWatchItems,
} from '@components/AddressListSearch/AddressListSearch'
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
    const { members } = useSpaceMembers()

    const membersWithAddress: ResultsWithIdForVList[] = useMemo(() => {
        const mappedMembers = members.map((m) => {
            const address = createUserIdFromString(m.userId)?.accountAddress ?? ''
            return {
                userId: m.userId,
                name: m.name,
                address,
                id: m.userId,
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

    const { selectedItems, onItemClick } = useWatchItems({
        initialItems: initialItems,
        onUpdate: (items) => {
            onUpdate(items)
        },
    })

    const noResults = !results.length && !isCustomAddress

    return (
        <>
            <SelectedItemsList items={selectedItems}>
                {({ item }) => {
                    const member = membersWithAddress.find((m) => m.address === item)
                    return (
                        <SelectedMemberItem address={item} member={member} onClick={onItemClick} />
                    )
                }}
            </SelectedItemsList>
            <MotionBox layout="position">
                <TextField
                    data-testid="member-search"
                    background="level3"
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
                        checked={selectedItems.includes(search)}
                        onChange={() => onItemClick(search)}
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
                            selectedItems={selectedItems}
                            onItemClick={onItemClick}
                        />
                    )}
                />
            )}
        </>
    )
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
    onClick: (address: string, e: React.MouseEvent<HTMLElement>) => void
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
                    onClick={(e) => onClick(address, e)}
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
