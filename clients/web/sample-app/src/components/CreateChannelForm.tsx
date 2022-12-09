import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    Theme,
    Typography,
} from '@mui/material'
import {
    CreateChannelInfo,
    Membership,
    RoomIdentifier,
    RoomVisibility,
    useCreateChannelTransaction,
    useRolesAndPermissions,
} from 'use-zion-client'
import React, { useCallback, useMemo, useState } from 'react'

import { ChannelRoleSettings, RolesSettings } from 'routes/ChannelRoleSettings'
import { useAsyncButtonCallback } from '../hooks/use-async-button-callback'

interface Props {
    parentSpaceId: RoomIdentifier
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

export function CreateChannelForm(props: Props): JSX.Element {
    const [channelName, setChannelName] = useState<string>('')
    const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.Private)
    const [roles, setRoles] = useState<RolesSettings>({})
    const { getRolesFromSpace } = useRolesAndPermissions()
    const { createChannelWithSpaceRoles } = useCreateChannelTransaction()
    const { onClick, parentSpaceId } = props

    const disableCreateButton = useMemo(() => channelName.length === 0, [channelName.length])

    const onChangeChannelName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setChannelName(event.target.value)
    }, [])

    const onChangeVisibility = useCallback((event: SelectChangeEvent) => {
        setVisibility(event.target.value as RoomVisibility)
    }, [])

    const onChangeRoles = useCallback((roles: RolesSettings) => {
        setRoles(roles)
    }, [])

    const onClickCreateChannel = useAsyncButtonCallback(async () => {
        const createRoomInfo: CreateChannelInfo = {
            name: channelName,
            visibility,
            parentSpaceId: parentSpaceId,
            roleIds: [],
        }

        // Use the roles from the parent space to create the channel
        const spaceRoles = await getRolesFromSpace(parentSpaceId.matrixRoomId)
        if (spaceRoles) {
            for (const r of spaceRoles) {
                if (roles[r.name]?.isSelected) {
                    console.log(`Adding role ${r.name} to channel`)
                    createRoomInfo.roleIds.push(r.roleId.toNumber())
                }
            }
        }

        const roomId = await createChannelWithSpaceRoles(createRoomInfo)
        if (roomId) {
            onClick(roomId, Membership.Join)
        }
    }, [createChannelWithSpaceRoles, onClick, parentSpaceId, channelName, visibility])

    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{
                p: (theme: Theme) => theme.spacing(8),
            }}
        >
            <Typography noWrap variant="h6" component="div" sx={spacingStyle}>
                CREATE CHANNEL
            </Typography>
            <Box display="grid" gridTemplateRows="repeat(5, 1fr)">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Channel name:
                    </Typography>
                    <TextField
                        id="filled-basic"
                        label="Name of the channel"
                        variant="filled"
                        onChange={onChangeChannelName}
                    />
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="20px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Visibility:
                    </Typography>
                    <Box minWidth="120px">
                        <FormControl fullWidth>
                            <InputLabel id="visibility-select-label" />
                            <Select
                                labelId="visibility-select-label"
                                id="visibility-select"
                                value={visibility}
                                onChange={onChangeVisibility}
                            >
                                <MenuItem value={RoomVisibility.Public}>public</MenuItem>
                                <MenuItem value={RoomVisibility.Private}>private</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(1, 1fr)"
                    marginTop="20px"
                >
                    <ChannelRoleSettings
                        spaceId={parentSpaceId.matrixRoomId}
                        onChangeValue={onChangeRoles}
                    />
                </Box>
                <Box />
                <Box display="flex" flexDirection="column" alignItems="center">
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={disableCreateButton}
                        onClick={onClickCreateChannel}
                    >
                        Create
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
