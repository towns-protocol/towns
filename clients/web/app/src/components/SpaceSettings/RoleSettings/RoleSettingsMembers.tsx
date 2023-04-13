import React, { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { TokenSelector } from '@components/SpaceSettings/TokenSelector'
import { Box, Button, Divider, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { useSettingsRolesStore } from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { shortAddress } from 'ui/utils/utils'
import { useCorrectChainForServer } from 'hooks/useCorrectChainForServer'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { TokenList } from '@components/Tokens'
import { useAuth } from 'hooks/useAuth'
import { FetchedTokenAvatar } from '@components/Tokens/FetchedTokenAvatar'

export const RoleSettingsMembers = () => {
    const { role: roleId } = useParams()
    const { loggedInWalletAddress } = useAuth()

    const role = useSettingsRolesStore(({ getRole }) => (roleId ? getRole(roleId) : undefined))

    const storeTokens = useSettingsRolesStore((state) => {
        return role?.tokens ?? []
    })
    const setStoreTokens = useSettingsRolesStore((state) => state.setTokens)

    const [users, setUsers] = useSettingsRolesStore((state) => [role?.users ?? [], state.setUsers])
    const [tokenModal, setShowTokenModal] = useState(false)
    const [tokenListSelectedTokens, setTokenListSelectedTokens] = useState<string[]>(storeTokens)
    const showTokenModal = () => setShowTokenModal(true)
    const hideTokenModal = () => setShowTokenModal(false)
    const onTokensSelected = useEvent((addresses: string[]) => {
        setTokenListSelectedTokens(addresses)
    })
    const onAddTokenClick = useEvent(() => {
        if (roleId && tokenListSelectedTokens) {
            setStoreTokens(roleId, tokenListSelectedTokens)
        }
        hideTokenModal()
    })

    if (!role || !roleId) {
        return <>Undefined role {roleId}</>
    }
    return (
        <Stack>
            <Box gap="lg">
                <Stack gap>
                    <Paragraph strong>Token gated</Paragraph>
                    <Paragraph color="gray2">
                        Users may hold any of the following tokens to get access to this role.
                    </Paragraph>
                    <TokenSelector
                        label="Edit tokens"
                        data={storeTokens}
                        itemRenderer={(props) => <TokenRenderer {...props} />}
                        onClick={showTokenModal}
                        onUpdate={(tokens) => setStoreTokens(roleId, tokens)}
                    />
                </Stack>
                <Divider />
                <Stack gap>
                    <Paragraph strong>User gated</Paragraph>
                    <Paragraph color="gray2">Add current members to this role.</Paragraph>
                    <TokenSelector
                        label="Add people"
                        placeholder="Enter a user's wallet address"
                        data={users}
                        itemRenderer={(props) => <MemberRenderer {...props} />}
                        onUpdate={(users) => setUsers(roleId, users)}
                    />
                </Stack>
            </Box>
            {tokenModal && loggedInWalletAddress && (
                <ModalContainer stableTopAlignment onHide={hideTokenModal}>
                    <Stack gap>
                        <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                            <Text strong>Edit tokens</Text>
                            <IconButton icon="close" color="default" onClick={hideTokenModal} />
                        </Stack>
                        <TokenList
                            showTokenList
                            listMaxHeight="300"
                            initialTokens={storeTokens}
                            wallet={loggedInWalletAddress}
                            onUpdate={onTokensSelected}
                        />
                        <Stack horizontal gap justifyContent="end">
                            <Button tone="cta1" onClick={onAddTokenClick}>
                                Update
                            </Button>
                        </Stack>
                    </Stack>
                </ModalContainer>
            )}
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

const MemberRenderer = (props: { item: string; onRemoveItem: (id: string) => void }) => {
    const onClick = useCallback(() => {
        props.onRemoveItem(props.item)
    }, [props])
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
            {/* {t.imgSrc && <Avatar src={t.imgSrc} size="avatar_sm" />}
            {t.label && <Text size="sm">{t.label}</Text>} */}
            <Text size="sm" color="gray2">
                {shortAddress(props.item)}
            </Text>
            <IconButton size="square_sm" icon="close" onClick={onClick} />
        </Stack>
    )
}
