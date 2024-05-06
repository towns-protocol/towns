import { Box, Button, TextField, Theme, Typography } from '@mui/material'
import React, { useCallback, useMemo, useState } from 'react'

interface Props {
    spaceId: string
    spaceName: string
    mintMembership: (spaceId: string, walletAddress: string) => Promise<void>
    onClickCancel: () => void
}

export function MintMembershipToAddressForm(props: Props): JSX.Element {
    const [walletAddress, setWalletAddress] = useState<string>('')

    const header = `Mint a membership for space "${props.spaceName}"`

    const disableInviteButton = useMemo(() => walletAddress.length === 0, [walletAddress.length])

    const onChangeWalletAddress = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setWalletAddress(event.target.value)
    }, [])

    const onClickInvite = useCallback(async () => {
        props.mintMembership(props.spaceId, walletAddress)
    }, [walletAddress, props])

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
                {header}
            </Typography>
            <Box display="grid" gridTemplateRows="repeat(3, 1fr)">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Wallet address:
                    </Typography>
                    <TextField
                        fullWidth
                        id="filled-basic"
                        label="0x..."
                        variant="filled"
                        onChange={onChangeWalletAddress}
                    />
                </Box>
                <Box />
                <Box display="grid" alignItems="center" gridTemplateColumns="repeat(2, 1fr)">
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={disableInviteButton}
                            onClick={onClickInvite}
                        >
                            Mint
                        </Button>
                    </Box>
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Button variant="contained" color="primary" onClick={props.onClickCancel}>
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
