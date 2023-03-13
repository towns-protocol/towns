import React, { useCallback } from 'react'
import { useParams } from 'react-router'
import { TokenSelector } from '@components/SpaceSettings/TokenSelector'
import { Box, Divider, IconButton, Paragraph, Stack, Text } from '@ui'
import { useSettingsRolesStore } from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { shortAddress } from 'ui/utils/utils'

export const RoleSettingsMembers = () => {
    const { role: roleId } = useParams()

    const role = useSettingsRolesStore(({ getRole }) => (roleId ? getRole(roleId) : undefined))

    const tokens = useSettingsRolesStore((state) => {
        return role?.tokens ?? []
    })
    const setTokens = useSettingsRolesStore((state) => state.setTokens)

    const [users, setUsers] = useSettingsRolesStore((state) => [role?.users ?? [], state.setUsers])

    if (!role || !roleId) {
        return <>Undefined role {roleId}</>
    }
    return (
        <Stack>
            <Box gap="lg">
                {/* <TextField background="level2" placeholder="Search members" height="height_xl" /> */}
                <Stack gap>
                    <Paragraph strong>Token gated</Paragraph>
                    <Paragraph color="gray2">
                        Users may hold any of the following tokens to get access to this role.
                    </Paragraph>
                    <TokenSelector
                        label="Add token"
                        data={tokens}
                        itemRenderer={(props) => <TokenRenderer {...props} />}
                        itemFromString={(id) => id}
                        onUpdate={(tokens) => setTokens(roleId, tokens)}
                    />
                </Stack>
                <Divider />
                <Stack gap>
                    <Paragraph strong>User gated</Paragraph>
                    <Paragraph color="gray2">Add current members to this role.</Paragraph>
                    <TokenSelector
                        label="Add people"
                        data={users}
                        itemRenderer={(props) => <TokenRenderer {...props} />}
                        itemFromString={(id) => id}
                        onUpdate={(users) => setUsers(roleId, users)}
                    />
                </Stack>
            </Box>
        </Stack>
    )
}

const TokenRenderer = (props: { item: string; onRemoveItem: (id: string) => void }) => {
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
