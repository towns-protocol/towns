import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { Box, Stack, Text, Toggle } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { ModalContainer } from '@components/Modals/ModalContainer'

export const GDMChannelPermissionsPanel = () => {
    const navigate = useNavigate()
    const onClose = useCallback(() => {
        navigate('../info?channel')
    }, [navigate])

    return (
        <Panel modalPresentable label="Member Permissions" onClosed={onClose}>
            <GDMChannelPermissions />
        </Panel>
    )
}

export const GDMChannelPermissionsModal = (props: { onHide: () => void }) => {
    return (
        <ModalContainer touchTitle="Member Permissions" onHide={props.onHide}>
            <GDMChannelPermissions />
        </ModalContainer>
    )
}

export const GDMChannelPermissions = () => {
    const [allowSendMessages, setAllowSendMessages] = useState(true)
    const [allowInviteRemove, setAllowInviteRemove] = useState(true)
    const [allowModifySettings, setAllowModifySettings] = useState(true)

    return (
        <Stack gap paddingX="md" paddingY="lg" background="level2" rounded="sm">
            <Text color="default" fontWeight="strong" fontSize="md">
                What can members of this group do?
            </Text>
            <ToggleGroup
                label="Send messages"
                description="Allows members to send messages."
                toggled={allowSendMessages}
                onToggle={setAllowSendMessages}
            />

            <ToggleGroup
                label="Add/remove people"
                description="Allows members to add or remove other people."
                toggled={allowInviteRemove}
                onToggle={setAllowInviteRemove}
            />
            <ToggleGroup
                label="Modify group settings"
                description="Allows members to change space image, name, topic, and other settings such as permissions."
                toggled={allowModifySettings}
                onToggle={setAllowModifySettings}
            />
        </Stack>
    )
}

type ToggleGroupProps = {
    label: string
    description: string
    toggled: boolean
    onToggle: (toggled: boolean) => void
}

const ToggleGroup = (props: ToggleGroupProps) => {
    const { label, description, toggled, onToggle } = props
    return (
        <Stack horizontal paddingY="sm">
            <Stack gap>
                <Text color="default">{label}</Text>
                <Text color="gray2">{description}</Text>
            </Stack>
            <Box grow />
            <Toggle toggled={toggled} onToggle={onToggle} />
        </Stack>
    )
}
