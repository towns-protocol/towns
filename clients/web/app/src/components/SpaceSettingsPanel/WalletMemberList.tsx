import React, { useMemo } from 'react'
import { Address } from 'use-towns-client'
import { Box } from '@ui'
import { MultipleAddresses } from '@components/AddressSelection/MultipleAddresses'
import { AddressSelectionDisplay } from '@components/AddressSelection/AddressSelectionDisplay'
import { useLookupUsersWithAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

type Props = {
    walletMembers: Address[]
    isRole: boolean | undefined
    readOnly?: boolean
} & (
    | { readOnly: true }
    | {
          readOnly?: false
          onRemove: (address: Address) => void
          onRemoveAll: () => void
      }
)

export const WalletMemberList: React.FC<Props> = ({
    walletMembers,
    isRole,
    readOnly = false,
    ...props
}) => {
    const onRemove = !readOnly && 'onRemove' in props ? props.onRemove : undefined
    const onRemoveAll = !readOnly && 'onRemoveAll' in props ? props.onRemoveAll : undefined

    const { data: users } = useLookupUsersWithAbstractAccountAddress()

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

    return (
        <Box>
            {selectedAddresses.length <= 15 ? (
                <>
                    {selectedAddresses.map((address) => (
                        <AddressSelectionDisplay
                            key={address}
                            address={address}
                            onRemove={readOnly ? undefined : onRemove}
                        />
                    ))}
                    {selectedAddresses.length === 0 &&
                        walletMembers.length <= 15 &&
                        unselectedAddresses.map((address) => (
                            <AddressSelectionDisplay
                                key={address}
                                address={address}
                                onRemove={readOnly ? undefined : onRemove}
                            />
                        ))}
                </>
            ) : null}
            {walletMembers.length > 15 && (
                <MultipleAddresses
                    walletMembers={walletMembers}
                    selectedAddresses={selectedAddresses}
                    removeAll={readOnly ? undefined : onRemoveAll}
                />
            )}
        </Box>
    )
}
