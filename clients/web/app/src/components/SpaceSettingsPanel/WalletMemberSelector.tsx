import React, { useCallback, useMemo, useState } from 'react'
import {
    Address,
    useGetRootKeyFromLinkedWallet,
    useSpaceMembers,
    useUserLookupArray,
} from 'use-towns-client'
import { isAddress } from 'viem'
import { Box, BoxProps, Button, Stack, Text, TextField } from '@ui'
import { CSVUploader } from '@components/CSVUploader/CSVUploader'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'ui/utils/utils'
import { useDevice } from 'hooks/useDevice'
import { Avatar } from '@components/Avatar/Avatar'
import { WalletMemberList } from './WalletMemberList'

type Props = {
    isRole: boolean | undefined
    walletMembers: Address[]
    onChange: (addresses: Address[]) => void
    isValidationError: boolean
} & Pick<BoxProps, 'background'>

export const WalletMemberSelector = (props: Props) => {
    const { walletMembers, onChange, isValidationError, isRole } = props
    const { memberIds } = useSpaceMembers()
    const users = useUserLookupArray(memberIds)
    const [searchTerm, setSearchTerm] = useState('')
    const { isTouch } = useDevice()

    const handleCSVAddresses = useCallback(
        (addresses: Address[]) => {
            const newAddresses = [...new Set([...walletMembers, ...addresses])]
            onChange(newAddresses)
        },
        [walletMembers, onChange],
    )

    const handleRemoveAddress = useCallback(
        (addressToRemove: Address) => {
            onChange(walletMembers.filter((address) => address !== addressToRemove))
        },
        [walletMembers, onChange],
    )

    const handleRemoveAllAddresses = useCallback(() => {
        onChange([])
    }, [onChange])

    const handleAddAddress = useCallback(
        (newAddress: Address) => {
            if (!walletMembers.includes(newAddress)) {
                onChange([...walletMembers, newAddress])
            }
            setSearchTerm('')
        },
        [walletMembers, onChange],
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value)
    }

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (isAddress(searchTerm)) {
                handleAddAddress(searchTerm as Address)
            } else if (
                isRole &&
                users?.some((user) =>
                    getPrettyDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()),
                )
            ) {
                const user = users?.find((user) =>
                    getPrettyDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()),
                )
                if (user) {
                    handleAddAddress(user.userId as Address)
                }
            }
        }
    }

    const { data: rootKeyFromSearchTerm } = useGetRootKeyFromLinkedWallet({
        walletAddress: searchTerm as Address | undefined,
    })

    const filteredUsers = useMemo(() => {
        return (
            users?.filter(
                (user) =>
                    getPrettyDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (rootKeyFromSearchTerm &&
                        user.userId.toLowerCase().includes(rootKeyFromSearchTerm.toLowerCase())),
            ) || []
        )
    }, [users, searchTerm, rootKeyFromSearchTerm])

    return (
        <Stack gap data-testid="user-search">
            {JSON.stringify(walletMembers)}
            <Stack gap="sm">
                <Box position="relative">
                    <Box horizontal gap="sm" alignItems="center">
                        <TextField
                            value={searchTerm}
                            placeholder={
                                isRole ? 'Search members or enter address' : 'Enter wallet address'
                            }
                            background={props.background ?? 'level3'}
                            data-testid="address-selection-input"
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                        />
                        {!isTouch && (
                            <CSVUploader
                                handleCSVAddresses={handleCSVAddresses}
                                background={props.background ?? 'level3'}
                            />
                        )}
                    </Box>
                    {searchTerm ? (
                        <Box
                            position="absolute"
                            background="level3"
                            padding="sm"
                            rounded="sm"
                            top="x4"
                            left="none"
                            style={{ marginTop: '22px', zIndex: 9999 }}
                            cursor="default"
                        >
                            <Stack gap="xs" width="250">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <Button
                                            data-testid={`address-selection-option-${user.userId}`}
                                            key={user.userId}
                                            onClick={() =>
                                                handleAddAddress(
                                                    isAddress(searchTerm)
                                                        ? searchTerm
                                                        : (user.userId as Address),
                                                )
                                            }
                                        >
                                            <Avatar size="avatar_sm" userId={user.userId} />
                                            {getPrettyDisplayName(user)}
                                        </Button>
                                    ))
                                ) : isAddress(searchTerm) ? (
                                    <Button
                                        data-testid={`address-selection-option-${searchTerm}`}
                                        onClick={() => handleAddAddress(searchTerm as Address)}
                                    >
                                        Add address: {shortAddress(searchTerm as Address)}
                                    </Button>
                                ) : (
                                    <Box padding>
                                        <Text>
                                            {isRole
                                                ? 'Not a member or valid address'
                                                : 'Not a valid address'}
                                        </Text>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    ) : null}
                </Box>
                <WalletMemberList
                    walletMembers={walletMembers}
                    isRole={isRole}
                    onRemove={handleRemoveAddress}
                    onRemoveAll={handleRemoveAllAddresses}
                />
            </Stack>
            {isValidationError && <Text color="error">Please add at least one valid address.</Text>}
        </Stack>
    )
}
