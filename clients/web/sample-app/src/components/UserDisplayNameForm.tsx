import { Box, Button, TextField, Theme, Typography } from '@mui/material'
import { useSpaceContext, useTownsClient } from 'use-towns-client'
import React, { useCallback, useMemo, useState } from 'react'

import { useAsyncButtonCallback } from '../hooks/use-async-button-callback'

export function UserDisplayNameForm(): JSX.Element {
    const [displayNameEdit, setDisplayNameEdit] = useState<string>('')
    const { setDisplayName } = useTownsClient()
    const { spaceId } = useSpaceContext()
    const disableButton = useMemo(() => displayNameEdit.length < 3, [displayNameEdit.length])

    const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setDisplayNameEdit(event.target.value)
    }, [])

    const onClickSave = useAsyncButtonCallback(async () => {
        if (spaceId) {
            void setDisplayName(spaceId, displayNameEdit)
            setDisplayNameEdit('')
        } else {
            console.error('spaceId is required to set a display name')
        }
    }, [])

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
                Edit DisplayName
            </Typography>
            <Box display="grid" gridTemplateRows="repeat(5, 1fr)">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Display name:
                    </Typography>
                    <TextField
                        id="filled-basic"
                        label="Display name"
                        variant="filled"
                        onChange={onChange}
                    />
                </Box>
                <Box />
                <Box display="flex" flexDirection="column" alignItems="center">
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={disableButton}
                        onClick={onClickSave}
                    >
                        Save
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
