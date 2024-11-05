import React from 'react'
import { Address, Permission, useConnectivity, useHasPermission } from 'use-towns-client'
import { Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { TokenSelectionDisplay } from '@components/Tokens/TokenSelector/TokenSelection'
import { WalletMemberList } from '@components/SpaceSettingsPanel/WalletMemberList'
import { useNativeTokenWithQuantity } from '@components/Tokens/utils'
import { Entitlements } from 'hooks/useEntitlements'

export function RequirementsModal({
    spaceId,
    title,
    onClose,
    entitlements,
}: {
    spaceId: string | undefined
    title: string
    onClose: () => void
    entitlements: Entitlements | undefined
}) {
    const nativeTokenWithQuantity = useNativeTokenWithQuantity(entitlements?.ethBalance || '')
    const { loggedInWalletAddress } = useConnectivity()

    const { hasPermission: meetsMembershipRequirements } = useHasPermission({
        spaceId: spaceId,
        walletAddress: loggedInWalletAddress,
        permission: Permission.JoinSpace,
    })

    if (!entitlements) {
        return null
    }

    return (
        <ModalContainer touchTitle={title} padding="lg" onHide={onClose}>
            <Stack gap="x4">
                {(entitlements?.tokens.length > 0 || entitlements?.ethBalance) && (
                    <Stack gap="md">
                        <Text strong>Holding any of the following tokens:</Text>
                        {nativeTokenWithQuantity && (
                            <TokenSelectionDisplay elevate token={nativeTokenWithQuantity} />
                        )}
                        {entitlements?.tokens.map((token) => (
                            <TokenSelectionDisplay
                                elevate
                                key={
                                    token.chainId + token.data.address + (token.data.tokenId ?? '')
                                }
                                token={token}
                                userPassesEntitlement={
                                    spaceId
                                        ? meetsMembershipRequirements !== undefined &&
                                          meetsMembershipRequirements
                                        : false
                                }
                            />
                        ))}
                    </Stack>
                )}
                {entitlements?.users.length > 0 && (
                    <Stack gap="md">
                        <Text strong>Connecting any of the following addresses:</Text>
                        <WalletMemberList
                            isRole
                            readOnly
                            walletMembers={entitlements?.users as Address[]}
                        />
                    </Stack>
                )}
            </Stack>
        </ModalContainer>
    )
}
