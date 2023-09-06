import React, { useMemo, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { TokensList } from '@components/Tokens'
import { Button, IconButton, Stack, Text } from '@ui'
import { MemberList } from '@components/SpaceSettings/RoleSettings/MemberListSearch'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'

export function TokenListModal({
    setStoreTokens,
    hideTokenModal,
    loggedInWalletAddress,
    roleId,
    storeTokens,
}: {
    setStoreTokens: (roleId: string, tokens: string[]) => void
    hideTokenModal: () => void
    loggedInWalletAddress: string
    roleId: string
    storeTokens: string[]
}) {
    const [tokenListSelectedTokens, setTokenListSelectedTokens] = useState<string[]>(storeTokens)

    const onTokensSelected = useEvent((addresses: TokenDataStruct[]) => {
        const _addresses = addresses.map((t) => t.contractAddress)
        setTokenListSelectedTokens(_addresses)
    })
    const onAddTokenClick = useEvent(() => {
        if (roleId && tokenListSelectedTokens) {
            setStoreTokens(roleId, tokenListSelectedTokens)
        }
        hideTokenModal()
    })

    const initialItems = useMemo(
        () => storeTokens.map((address) => ({ contractAddress: address })),
        [storeTokens],
    )
    return (
        <ModalContainer stableTopAlignment onHide={hideTokenModal}>
            <Stack gap>
                <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                    <Text strong>Edit tokens</Text>
                    <IconButton icon="close" color="default" onClick={hideTokenModal} />
                </Stack>
                <TokensList
                    showTokenList
                    listMaxHeight="300"
                    wallet={loggedInWalletAddress}
                    initialItems={initialItems}
                    onUpdate={onTokensSelected}
                />
                <Stack horizontal gap justifyContent="end">
                    <Button tone="cta1" onClick={onAddTokenClick}>
                        Update
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}

export function MemberListModal({
    storeUsers,
    hideMemberModal,
    roleId,
    setStoreUsers,
}: {
    storeUsers: string[]
    hideMemberModal: () => void
    roleId: string
    setStoreUsers: (roleId: string, users: string[]) => void
}) {
    const [memberListSelectedTokens, setMemberListSelectedItems] = useState<string[]>(storeUsers)

    const onSelectedMembersUpdated = useEvent((addresses: string[]) => {
        setMemberListSelectedItems(addresses)
    })

    const onAddMemberClick = useEvent(() => {
        if (roleId) {
            setStoreUsers(roleId, memberListSelectedTokens)
        }
        hideMemberModal()
    })

    return (
        <ModalContainer stableTopAlignment onHide={hideMemberModal}>
            <Stack gap data-testid="role-settings-gating-modal">
                <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                    <Text strong>Edit members</Text>
                    <IconButton icon="close" color="default" onClick={hideMemberModal} />
                </Stack>
                <MemberList initialItems={storeUsers} onUpdate={onSelectedMembersUpdated} />

                <Stack horizontal gap justifyContent="end">
                    <Button tone="cta1" onClick={onAddMemberClick}>
                        Update
                    </Button>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
