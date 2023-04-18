import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { createUserIdFromEthereumAddress, useZionClient } from 'use-zion-client'
import { TokenSelector } from '@components/SpaceSettings/TokenSelector'
import { Avatar, Box, Button, Divider, Icon, Paragraph, Stack, Text } from '@ui'
import { useSettingsRolesStore } from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { shortAddress } from 'ui/utils/utils'
import { useCorrectChainForServer } from 'hooks/useCorrectChainForServer'
import { useAuth } from 'hooks/useAuth'
import { FetchedTokenAvatar } from '@components/Tokens/FetchedTokenAvatar'
import { useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'
import { EVERYONE_ADDRESS } from 'utils'
import { MemberListModal, TokenListModal } from './GatingModals'

export const RoleSettingsMembers = () => {
    const { role: roleId } = useParams()
    const { loggedInWalletAddress } = useAuth()
    const role = useSettingsRolesStore(({ getRole }) => (roleId ? getRole(roleId) : undefined))

    const storeTokens = useSettingsRolesStore(() => role?.tokens ?? [])
    const setStoreTokens = useSettingsRolesStore((state) => state.setTokens)
    const [tokenModal, setShowTokenModal] = useState(false)
    const showTokenModal = () => setShowTokenModal(true)
    const hideTokenModal = () => setShowTokenModal(false)

    const storeUsers = useSettingsRolesStore(() => role?.users ?? [])
    const setStoreUsers = useSettingsRolesStore((state) => state.setUsers)
    const [memberModal, setShowMemberModal] = useState(false)
    const showMemberModal = () => setShowMemberModal(true)
    const hideMemberModal = () => setShowMemberModal(false)

    if (!role || !roleId) {
        return <>Undefined role {roleId}</>
    }
    return (
        <Stack data-testid="role-settings-members-content">
            <Box gap="lg">
                <Stack gap data-testid="role-settings-members-token-gated">
                    <Paragraph strong>Token gated</Paragraph>
                    <Paragraph color="gray2">
                        Users may hold any of the following tokens to get access to this role.
                    </Paragraph>
                    <TokenSelector
                        label="Add tokens"
                        data={storeTokens}
                        itemRenderer={(props) => <TokenRenderer {...props} />}
                        onClick={showTokenModal}
                        onUpdate={(tokens) => setStoreTokens(roleId, tokens)}
                    />
                </Stack>
                <Divider />
                <Stack gap data-testid="role-settings-members-user-gated">
                    <Paragraph strong>User gated</Paragraph>
                    <Paragraph color="gray2">Add current members to this role.</Paragraph>
                    <TokenSelector
                        label="Add people"
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

            {tokenModal && loggedInWalletAddress && (
                <TokenListModal
                    hideTokenModal={hideTokenModal}
                    loggedInWalletAddress={loggedInWalletAddress}
                    roleId={roleId}
                    storeTokens={storeTokens}
                    setStoreTokens={setStoreTokens}
                />
            )}
        </Stack>
    )
}

const MemberRenderer = (props: { item: string; onRemoveItem: (id: string) => void }) => {
    const { id: chainId } = useCorrectChainForServer()
    const { homeserverUrl } = useMatrixHomeServerUrl()
    const { client } = useZionClient()

    const matrixuser = useMemo(() => {
        if (!chainId) {
            return undefined
        }
        const _homeserverUrl = new URL(homeserverUrl || '')
        const userId = createUserIdFromEthereumAddress(
            props.item,
            chainId,
        ).matrixUserIdLocalpart.toLowerCase()
        const matrixIdFromAddress = `@${userId}:${_homeserverUrl.hostname}`
        return client?.getUser(matrixIdFromAddress)
    }, [chainId, homeserverUrl, props.item, client])

    const onClick = useEvent(() => {
        props.onRemoveItem(props.item)
    })

    const avatarContent = () => {
        if (props.item === EVERYONE_ADDRESS) {
            return <Avatar icon="people" size="avatar_x4" />
        }
        if (!matrixuser) {
            return <Avatar size="avatar_x4" />
        }
        return <Avatar size="avatar_x4" userId={matrixuser.userId} />
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
            <Text>{props.item === EVERYONE_ADDRESS ? 'Everyone' : matrixuser?.displayName}</Text>
            <Text color="gray2">
                {props.item === EVERYONE_ADDRESS
                    ? 'All wallet addresses'
                    : shortAddress(props.item)}
            </Text>
            <Button size="inline" tone="none" color="default" onClick={onClick}>
                Remove
            </Button>
        </Stack>
    )
}

const TokenRenderer = (props: { item: string; onRemoveItem: (id: string) => void }) => {
    const { network } = useCorrectChainForServer()

    const onClick = useEvent(() => {
        props.onRemoveItem(props.item)
    })

    const onAddressClick = useEvent(() => {
        window.open(
            `https://${network}.etherscan.io/address/${props.item}`,
            '_blank',
            'noopener,noreferrer',
        )
    })

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
            <FetchedTokenAvatar
                address={props.item}
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
                {shortAddress(props.item)}
                <Icon size="square_sm" type="linkOut" />
            </Button>
            <Button size="inline" tone="none" color="default" onClick={onClick}>
                Remove
            </Button>
        </Stack>
    )
}
