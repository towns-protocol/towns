import React, { useState } from 'react'
import { useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { Address } from 'wagmi'
import { useSpaceId } from 'use-zion-client'
import { TokenSelector } from '@components/SpaceSettings/TokenSelector'
import { Box, Button, Divider, Icon, Paragraph, Stack, Text } from '@ui'
import { useSettingsRolesStore } from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { shortAddress } from 'ui/utils/utils'
import { useAuth } from 'hooks/useAuth'
import { FetchedTokenAvatar } from '@components/Tokens/FetchedTokenAvatar'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { EVERYONE_ADDRESS } from 'utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { useCheckTokenType } from '@components/Web3/checkTokenType'
import { TokenType } from '@components/Tokens/types'
import { useGetUserFromAddress } from 'hooks/useGetUserFromAddress'
import { useIsMembershipNftAddress } from 'hooks/useIsMembershipNftAddress'
import { Avatar } from '@components/Avatar/Avatar'
import { MemberListModal, TokenListModal } from './GatingModals'
import { MemberSelector } from '../MemberSelector'
import { memberRoleId } from './rolePermissions.const'

type TokenModalProps = {
    showModal: boolean
    // if populated, we are editing a single token, not the whole list
    singleContractAddress: string | undefined
}

export const RoleSettingsGating = () => {
    const { role: roleId } = useParams()
    const { loggedInWalletAddress } = useAuth()
    const role = useSettingsRolesStore(({ getRole }) => (roleId ? getRole(roleId) : undefined))

    const storeTokens = useSettingsRolesStore(() => role?.tokens ?? [])
    const setStoreTokens = useSettingsRolesStore((state) => state.setTokens)
    const [tokenModal, setShowTokenModal] = useState<TokenModalProps>({
        showModal: false,
        singleContractAddress: undefined,
    })
    const showTokenModal = ({
        singleContractAddress: contractAddress,
    }: Omit<TokenModalProps, 'showModal'>) =>
        setShowTokenModal({
            showModal: true,
            singleContractAddress: contractAddress,
        })
    const hideTokenModal = () =>
        setShowTokenModal({
            showModal: false,
            singleContractAddress: undefined,
        })

    const storeUsers = useSettingsRolesStore(() => role?.users ?? [])
    const setStoreUsers = useSettingsRolesStore((state) => state.setUsers)
    const [memberModal, setShowMemberModal] = useState(false)
    const showMemberModal = () => setShowMemberModal(true)
    const hideMemberModal = () => setShowMemberModal(false)

    if (!role || !roleId) {
        return <>Undefined role {roleId}</>
    }
    return (
        <Stack data-testid="role-settings-gating-content">
            <Box gap="lg">
                <Stack gap data-testid="role-settings-gating-token-gated">
                    <Paragraph strong>Token gated</Paragraph>
                    <Paragraph color="gray2">
                        Users must hold ALL of the following tokens to get access to this role.
                    </Paragraph>
                    <TokenSelector
                        label="Add tokens"
                        data={storeTokens}
                        itemRenderer={(props) => (
                            <TokenRenderer
                                {...props}
                                roleId={roleId}
                                onEditSingleToken={() =>
                                    showTokenModal({
                                        singleContractAddress: props.item.contractAddress,
                                    })
                                }
                            />
                        )}
                        onAddTokenClick={() =>
                            showTokenModal({
                                singleContractAddress: undefined,
                            })
                        }
                        onUpdate={(tokens) => setStoreTokens(roleId, tokens)}
                    />
                </Stack>
                <Divider />
                <Stack gap data-testid="role-settings-gating-user-gated">
                    <Paragraph strong>User gated</Paragraph>
                    <Paragraph color="gray2">Add the following users to this role:</Paragraph>
                    <MemberSelector
                        label="Add users"
                        data={storeUsers}
                        itemRenderer={(props) => <MemberRenderer {...props} />}
                        onClick={showMemberModal}
                        onUpdate={(users) => setStoreUsers(roleId, users)}
                    />
                </Stack>
            </Box>

            {memberModal && (
                <MemberListModal
                    hideMemberModal={hideMemberModal}
                    roleId={roleId}
                    storeUsers={storeUsers}
                    setStoreUsers={setStoreUsers}
                />
            )}

            {tokenModal.showModal && loggedInWalletAddress && (
                <TokenListModal
                    hideTokenModal={hideTokenModal}
                    loggedInWalletAddress={loggedInWalletAddress}
                    roleId={roleId}
                    storeTokens={storeTokens}
                    setStoreTokens={setStoreTokens}
                    singleContractAddress={tokenModal.singleContractAddress}
                />
            )}
        </Stack>
    )
}

const MemberRenderer = (props: { item: string; onRemoveItem: (id: string) => void }) => {
    const member = useGetUserFromAddress(props.item)

    const onClick = useEvent(() => {
        props.onRemoveItem(props.item)
    })

    const avatarContent = () => {
        if (props.item === EVERYONE_ADDRESS) {
            return <Avatar icon="people" size="avatar_x4" />
        }
        if (!member) {
            return <Avatar size="avatar_x4" />
        }
        return <Avatar size="avatar_x4" userId={member.userId} />
    }

    return (
        <Stack
            padding
            horizontal
            gap
            key={props.item}
            alignItems="center"
            background="level2"
            borderRadius="sm"
        >
            {avatarContent()}
            <Text>
                {props.item === EVERYONE_ADDRESS
                    ? 'Everyone'
                    : getPrettyDisplayName(member).displayName}
            </Text>
            <Text color="gray2">
                {props.item === EVERYONE_ADDRESS
                    ? 'All wallet addresses'
                    : shortAddress(props.item)}
            </Text>
            <Button size="inline" tone="none" color="negative" onClick={onClick}>
                Remove
            </Button>
        </Stack>
    )
}

type TokenRendererProps = {
    item: TokenDataStruct
    roleId: string
    onEditSingleToken: (contractAddress: TokenDataStruct['contractAddress']) => void
    onRemoveItem: (contractAddress: TokenDataStruct['contractAddress']) => void
}

const TokenRenderer = (props: TokenRendererProps) => {
    const spaceId = useSpaceId()
    const { chainName } = useEnvironment()
    const tokenType = useCheckTokenType({ address: props.item.contractAddress as Address })

    const { data: isMembershipNft } = useIsMembershipNftAddress({
        address: props.item.contractAddress as Address,
        spaceId: spaceId?.streamId,
    })

    const onClick = useEvent(() => {
        props.onRemoveItem(props.item.contractAddress)
    })

    const onEditSingleToken = useEvent(() => {
        props.onEditSingleToken(props.item.contractAddress)
    })

    const onAddressClick = useEvent(() => {
        window.open(
            `https://${chainName}.etherscan.io/address/${props.item.contractAddress}`,
            '_blank',
            'noopener,noreferrer',
        )
    })

    // The "Member" role from town creation should not be allowed to remove the membership NFT as a gating token
    // otherwise we could have a town that is not gated by the membership NFT
    const isMemberRole = +props.roleId === memberRoleId
    const allowedToRemoveToken = !isMemberRole || (isMemberRole && !isMembershipNft)

    return (
        <Stack padding gap key={props.item.contractAddress} background="level2" borderRadius="sm">
            <Box horizontal gap="sm" alignItems="center">
                <FetchedTokenAvatar
                    address={props.item.contractAddress}
                    // omitting tokenIds because we add them below
                    tokenIds={[]}
                    size="avatar_x4"
                    labelProps={{
                        size: 'md',
                    }}
                    layoutProps={{
                        horizontal: true,
                        maxWidth: 'auto',
                    }}
                />
                <Button size="inline" tone="none" color="gray2" onClick={onAddressClick}>
                    {isMembershipNft ? 'Membership NFT' : shortAddress(props.item.contractAddress)}
                    <Icon size="square_sm" type="linkOut" />
                </Button>
                {tokenType === TokenType.ERC1155 && (
                    <Button size="inline" tone="none" color="default" onClick={onEditSingleToken}>
                        Edit
                    </Button>
                )}
                {allowedToRemoveToken && (
                    <Button size="inline" tone="none" color="negative" onClick={onClick}>
                        Remove
                    </Button>
                )}
            </Box>

            {props.item.tokenIds.length > 0 && (
                <Box horizontal gap="sm" alignItems="center">
                    <Box width="x4" />
                    <Text size="xs" color="gray2">
                        Token IDs:{' '}
                    </Text>
                    <Box horizontal flexWrap="wrap" gap="sm">
                        {props.item.tokenIds.map((tokenId) => (
                            <Box
                                centerContent
                                background="level4"
                                key={props.item.contractAddress + tokenId.toString()}
                                rounded="full"
                                padding="xs"
                                width="x2"
                                minWidth="x2"
                                aspectRatio="square"
                            >
                                <Text display="block" size="sm">
                                    {tokenId}
                                </Text>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Stack>
    )
}
