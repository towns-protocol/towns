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
    singleContractAddress,
}: {
    setStoreTokens: (roleId: string, tokens: TokenDataStruct[]) => void
    hideTokenModal: () => void
    loggedInWalletAddress: string
    roleId: string
    storeTokens: TokenDataStruct[]
    singleContractAddress: string | undefined
}) {
    const [tokenListSelectedTokens, setTokenListSelectedTokens] =
        useState<TokenDataStruct[]>(storeTokens)

    const onTokensSelected = useEvent((addresses: TokenDataStruct[]) => {
        setTokenListSelectedTokens(addresses)
    })
    const onAddTokenClick = useEvent(() => {
        if (roleId && tokenListSelectedTokens) {
            setStoreTokens(roleId, tokenListSelectedTokens)
        }
        hideTokenModal()
    })

    // If we are editing a single token, we only want to show that token
    const _initialItems = useMemo(() => {
        return singleContractAddress
            ? storeTokens.filter((t) => t.contractAddress === singleContractAddress)
            : storeTokens
    }, [singleContractAddress, storeTokens])

    return (
        <ModalContainer onHide={hideTokenModal}>
            <Stack gap>
                <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                    <Text strong>Edit tokens</Text>
                    <IconButton icon="close" color="default" onClick={hideTokenModal} />
                </Stack>
                <TokensList
                    showTokenList
                    listMaxHeight="300"
                    wallet={loggedInWalletAddress}
                    singleContractAddress={singleContractAddress}
                    initialItems={_initialItems}
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
