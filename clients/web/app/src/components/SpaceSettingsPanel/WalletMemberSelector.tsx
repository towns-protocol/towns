import React, { useCallback, useMemo, useState } from 'react'
import { Address } from 'use-towns-client'
import { isAddress } from 'ethers/lib/utils'
import { Box, Button, Stack, Text, TextField } from '@ui'
import { CSVUploader } from '@components/CSVUploader/CSVUploader'
import { useLookupUsersWithAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { MultipleAddresses } from '@components/AddressSelection/MultipleAddresses'
import { AddressSelectionDisplay } from '@components/AddressSelection/AddressSelectionDisplay'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { shortAddress } from 'ui/utils/utils'

type Props = {
    isRole: boolean | undefined
    walletMembers: Address[]
    onChange: (addresses: Address[]) => void
    isValidationError: boolean
}

export const WalletMemberSelector = (props: Props) => {
    const { walletMembers, onChange, isValidationError, isRole } = props
    const { data: users } = useLookupUsersWithAbstractAccountAddress()
    const [searchTerm, setSearchTerm] = useState('')

    const { selectedAddresses, unselectedAddresses } = useMemo(() => {
        if (isRole) {
            const usersAddresses = users?.map((user) => user.abstractAccountAddress) || []
            const selectedAddresses = walletMembers.filter((address) =>
                usersAddresses.includes(address),
            )
            const unselectedAddresses = walletMembers.filter(
                (address) => !usersAddresses.includes(address),
            )
            return {
                selectedAddresses,
                unselectedAddresses,
            }
        } else {
            return {
                selectedAddresses: [],
                unselectedAddresses: walletMembers,
            }
        }
    }, [users, walletMembers, isRole])

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
                    handleAddAddress(user.abstractAccountAddress)
                }
            }
        }
    }

    const filteredUsers =
        users?.filter(
            (user) =>
                getPrettyDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.abstractAccountAddress.toLowerCase().includes(searchTerm.toLowerCase()),
        ) || []

    return (
        <Stack gap data-testid="user-search">
            <Stack gap="xs">
                <Box position="relative">
                    <Box horizontal gap="xs" alignItems="center">
                        <TextField
                            value={searchTerm}
                            placeholder={
                                isRole ? 'Search members or enter address' : 'Enter address'
                            }
                            background="level2"
                            data-testid="address-selection-input"
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                        />
                        <CSVUploader handleCSVAddresses={handleCSVAddresses} />
                    </Box>
                    {searchTerm ? (
                        <Box
                            position="absolute"
                            background="level1"
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
                                            data-testid={`address-selection-option-${user.abstractAccountAddress}`}
                                            key={user.abstractAccountAddress}
                                            onClick={() =>
                                                handleAddAddress(user.abstractAccountAddress)
                                            }
                                        >
                                            {getPrettyDisplayName(user)} (
                                            {shortAddress(user.abstractAccountAddress)})
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
                                    <Box padding="md">
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
                <Box>
                    {selectedAddresses.length <= 15 ? (
                        <>
                            {selectedAddresses.map((address) => (
                                <AddressSelectionDisplay
                                    key={address}
                                    address={address}
                                    onRemove={handleRemoveAddress}
                                />
                            ))}
                            {selectedAddresses.length === 0 &&
                                walletMembers.length <= 15 &&
                                unselectedAddresses.map((address) => (
                                    <AddressSelectionDisplay
                                        key={address}
                                        address={address}
                                        onRemove={handleRemoveAddress}
                                    />
                                ))}
                        </>
                    ) : null}
                    {walletMembers.length > 15 && (
                        <MultipleAddresses
                            walletMembers={walletMembers}
                            selectedAddresses={selectedAddresses}
                            removeAll={handleRemoveAllAddresses}
                        />
                    )}
                </Box>
            </Stack>
            {isValidationError && <Text color="error">Please add at least one valid address.</Text>}
        </Stack>
    )
}
