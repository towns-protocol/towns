import React, { useCallback, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
    CreateSpaceInfo,
    Membership,
    RoomIdentifier,
    RoomVisibility,
    useZionClient,
} from 'use-zion-client'
import { atoms } from 'ui/styles/atoms.css'
import { Box, Button, Divider, Dropdown, Paragraph, Stack, TextField } from '@ui'

interface Props {
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

export const CreateSpaceForm = (props: Props) => {
    const VisibilityOptions = [RoomVisibility.Private, RoomVisibility.Public]
    const [spaceName, setSpaceName] = useState<string>('')
    const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.Public)
    const { createSpaceRoom } = useZionClient()

    const disableCreateButton = useMemo(() => spaceName.length === 0, [spaceName.length])

    const onSpaceNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSpaceName(event.target.value)
    }, [])

    const onClickCreateSpace = useCallback(async () => {
        if (disableCreateButton) {
            console.log('please enter a space name')
            return
        }
        const createSpaceInfo: CreateSpaceInfo = {
            name: spaceName,
            visibility,
        }
        const roomId = await createSpaceRoom(createSpaceInfo)

        if (roomId) {
            console.log('space created with id', roomId)
            props.onClick(roomId, Membership.Join)
        }
    }, [createSpaceRoom, props, spaceName, visibility, disableCreateButton])

    return (
        <Stack padding gap="lg" minWidth="400">
            <Stack gap="lg">
                <TextField
                    autoFocus
                    background="level2"
                    label="Space Name"
                    secondaryLabel="(required)"
                    description="This is your official space name that you own. Your space's URL will contain the same name."
                    placeholder="Space Name"
                    onChange={onSpaceNameChange}
                />

                <Dropdown
                    background="level2"
                    label="Visibility"
                    message=""
                    options={VisibilityOptions.map((value) => ({
                        label: value,
                        value,
                    }))}
                    defaultValue={visibility}
                    onChange={(value) => setVisibility(value as RoomVisibility)}
                />
                <Box gap="md">
                    <Paragraph strong>Space URL</Paragraph>
                    <Paragraph color="gray1">
                        This is what your official URL will look like
                    </Paragraph>
                    <Paragraph strong truncate size="md" display="inline-block">
                        zion.xyz/
                        <span className={atoms({ color: 'gray2' })}>{spaceName}</span>
                    </Paragraph>
                </Box>
            </Stack>
            <Divider />
            <Button size="button_md" tone="cta1" onClick={onClickCreateSpace}>
                Create
            </Button>
            <Box centerContent color="gray2">
                <NavLink to="/">Cancel</NavLink>
            </Box>
        </Stack>
    )
}
