import React, { useMemo } from 'react'
import { Address, useSpaceMembers, useUserLookupArray } from 'use-towns-client'
import { Box } from '@ui'
import { MultipleAddresses } from '@components/AddressSelection/MultipleAddresses'
import { AddressSelectionDisplay } from '@components/AddressSelection/AddressSelectionDisplay'

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

const displayLimit = 15

export const WalletMemberList: React.FC<Props> = ({
    walletMembers,
    isRole,
    readOnly = false,
    ...props
}) => {
    const onRemove = !readOnly && 'onRemove' in props ? props.onRemove : undefined
    const onRemoveAll = !readOnly && 'onRemoveAll' in props ? props.onRemoveAll : undefined

    const { memberIds } = useSpaceMembers()
    const users = useUserLookupArray(memberIds)

    const { selectedAddresses, unselectedAddresses } = useMemo(() => {
        if (isRole) {
            const usersAddresses = users?.map((user) => user.userId) || []
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
        <Box gap="sm">
            {selectedAddresses.length <= displayLimit ? (
                <>
                    {selectedAddresses.map((address) => (
                        <AddressSelectionDisplay
                            key={address}
                            address={address}
                            onRemove={readOnly ? undefined : onRemove}
                        />
                    ))}
                    {selectedAddresses.length === 0 &&
                        walletMembers.length <= displayLimit &&
                        unselectedAddresses.map((address) => (
                            <AddressSelectionDisplay
                                key={address}
                                address={address}
                                onRemove={readOnly ? undefined : onRemove}
                            />
                        ))}
                </>
            ) : null}
            {walletMembers.length > displayLimit && (
                <MultipleAddresses
                    walletMembers={walletMembers}
                    selectedAddresses={selectedAddresses}
                    removeAll={readOnly ? undefined : onRemoveAll}
                />
            )}
        </Box>
    )
}
