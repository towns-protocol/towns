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
    TransactionStatus,
    useCreateChannelTransaction,
    useRoles,
} from 'use-zion-client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChannelRoleSettings, RolesSettings } from 'routes/ChannelRoleSettings'

import { useAsyncButtonCallback } from '../hooks/use-async-button-callback'

interface Props {
    parentSpaceId: RoomIdentifier
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

export function CreateChannelForm(props: Props): JSX.Element {
    const [channelName, setChannelName] = useState<string>('')
    const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.Private)
    const [encrypted, setEncrypted] = useState<'yes' | 'no'>('yes')
    const [roles, setRoles] = useState<RolesSettings>({})
    const { spaceRoles } = useRoles(props.parentSpaceId.networkId)
    const { onClick, parentSpaceId } = props
    const {
        isLoading,
        data: roomId,
        transactionHash,
        transactionStatus,
        error,
        createChannelTransaction,
    } = useCreateChannelTransaction()

    const disableCreateButton = useMemo(() => channelName.length === 0, [channelName.length])

    const onChangeChannelName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setChannelName(event.target.value)
    }, [])

    const onChangeVisibility = useCallback((event: SelectChangeEvent) => {
        setVisibility(event.target.value as RoomVisibility)
    }, [])

    const onChangeEncrypted = useCallback((event: SelectChangeEvent) => {
        setEncrypted(event.target.value as 'yes' | 'no')
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
            disableEncryption: encrypted === 'no',
        }

        // Use the roles from the parent space to create the channel
        if (spaceRoles) {
            for (const r of spaceRoles) {
                if (roles[r.name]?.isSelected) {
                    console.log(`Adding role ${r.name} to channel`)
                    createRoomInfo.roleIds.push(r.roleId.toNumber())
                }
            }
        }

        await createChannelTransaction(createRoomInfo)
    }, [createChannelTransaction, onClick, parentSpaceId, channelName, visibility])

    useEffect(() => {
        if (transactionStatus === TransactionStatus.Success && roomId) {
            onClick(roomId, Membership.Join)
        }
    }, [onClick, roomId, transactionStatus])

    console.log('CreateChannelForm', 'states', {
        isLoading,
        roomId,
        error,
        transactionHash,
        transactionStatus,
    })

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
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="20px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Encrypted:
                    </Typography>
                    <Box minWidth="120px">
                        <FormControl fullWidth>
                            <InputLabel id="encrypted-select-label" />
                            <Select
                                labelId="encrypted-select-label"
                                id="encrypted-select"
                                value={encrypted}
                                onChange={onChangeEncrypted}
                            >
                                <MenuItem value="yes">yes</MenuItem>
                                <MenuItem value="no">no</MenuItem>
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
                        spaceId={parentSpaceId.networkId}
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
