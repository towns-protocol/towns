import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Snackbar,
    Theme,
    Typography,
} from '@mui/material'
import { AuthStatus, useCasablancaStore, useConnectivity, useTownsClient } from 'use-towns-client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { makeStyles } from '@mui/styles'
import { usePrivy } from '@privy-io/react-auth'
import { useGetEmbeddedSigner } from '@towns/privy'
import { useEnvironment } from 'hooks/use-environment'
import { EnvironmentSelect } from './EnvironmentSelect'
import { ChainSwitchingButton } from './Buttons/ChainSwitchingButton'

const loginMsgToSign = `Click to sign in and accept the Harmony Terms of Service.`

export function Login(): JSX.Element {
    const styles = useStyles()
    const [showError, setShowError] = useState<string | undefined>(undefined)
    const { authError: casabalancaAuthError } = useCasablancaStore()
    const { authenticated: privyAuthenticated } = usePrivy()

    const onCloseAlert = useCallback(function () {
        setShowError(undefined)
    }, [])

    useEffect(() => {
        if (casabalancaAuthError?.message) {
            setShowError(casabalancaAuthError.message)
        } else {
            setShowError('')
        }
    }, [casabalancaAuthError])

    return (
        <div className={styles.container}>
            <Box sx={{ display: 'grid' }}>
                <EnvironmentSelect />
                <PrivyInfo />
                {privyAuthenticated && <NetworkInfo />}
            </Box>
            <Snackbar
                open={showError ? true : false}
                autoHideDuration={5000}
                onClose={onCloseAlert}
            >
                <Alert severity="error" onClose={onCloseAlert}>
                    {showError}
                </Alert>
            </Snackbar>
        </div>
    )
}

function NetworkInfo() {
    const { loginWithWalletToCasablanca } = useTownsClient()
    const { authStatus: casablancaAuthStatus } = useCasablancaStore()
    const { id: environmentId } = useEnvironment()
    const { isAuthenticated } = useConnectivity()
    const getSigner = useGetEmbeddedSigner()

    const onLoginCasablanca = useCallback(
        async function () {
            const signer = await getSigner()
            loginWithWalletToCasablanca(loginMsgToSign, signer)
        },
        [loginWithWalletToCasablanca, getSigner],
    )

    const casablancaButton = useMemo(() => {
        if (casablancaAuthStatus === AuthStatus.EvaluatingCredentials) {
            return <CircularProgress size={56} />
        } else if (casablancaAuthStatus === AuthStatus.None || !isAuthenticated) {
            return (
                <ChainSwitchingButton
                    variant="contained"
                    color="primary"
                    sx={{ margin: '20px' }}
                    onClick={onLoginCasablanca}
                >
                    Login (casablanca)
                </ChainSwitchingButton>
            )
        } else {
            return (
                <Typography variant="h6" component="span">
                    Casablanca Login Status: {casablancaAuthStatus}
                </Typography>
            )
        }
    }, [casablancaAuthStatus, isAuthenticated, onLoginCasablanca])

    //{`Remote Url: ${(casablancaUrl ?? '').substring(0, 50)}`}
    return (
        <>
            <Box
                sx={{
                    display: 'grid',
                    marginTop: '20px',
                    alignItems: 'Center',
                }}
            >
                <Chip
                    label="Casablanca"
                    sx={{
                        borderRadius: 0,
                    }}
                />
                <Paper elevation={3} sx={{ padding: '20px' }}>
                    <Typography variant="h6" component="p" sx={{ marginTop: '20px' }}>
                        {`Environment: ${environmentId}`}
                    </Typography>
                    {casablancaButton}
                </Paper>
            </Box>
        </>
    )
}

function PrivyInfo() {
    const {
        ready: privyReady,
        authenticated: privyAuthenticated,
        logout: privyLogout,
        login: privyLogin,
    } = usePrivy()
    const {
        //login: riverLogin,
        //logout: riverLogout,
        loggedInWalletAddress,
        isAuthenticated: riverIsAuthenticated,
        authError: riverAuthError,
        authStatus: riverAuthStatus,
    } = useConnectivity()

    useEffect(() => {
        console.log('Login.tsx::useConnectivity', {
            privyReady,
            privyAuthenticated,
            riverAuthStatus,
            loggedInWalletAddress,
            riverIsAuthenticated,
            riverAuthError,
        })
    }, [
        loggedInWalletAddress,
        privyAuthenticated,
        privyReady,
        riverAuthError,
        riverAuthStatus,
        riverIsAuthenticated,
    ])

    if (!privyReady) {
        return (
            <Box
                display="grid"
                alignItems="center"
                gridTemplateColumns="repeat(2, 1fr)"
                marginTop="20px"
            >
                <Typography variant="h6">Privy not ready</Typography>
            </Box>
        )
    } else if (!privyAuthenticated) {
        return (
            <Box
                display="grid"
                alignItems="center"
                gridTemplateColumns="repeat(2, 1fr)"
                marginTop="20px"
            >
                <Typography variant="h6" component="span">
                    Privy:
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    sx={{ margin: '10px' }}
                    onClick={() => privyLogin()}
                >
                    Login
                </Button>
            </Box>
        )
    } else {
        return (
            <Box
                display="grid"
                alignItems="center"
                gridTemplateColumns="repeat(2, 1fr)"
                marginTop="20px"
            >
                <Typography variant="h6" component="span">
                    Privy:
                </Typography>
                <Button
                    variant="contained"
                    color="secondary"
                    sx={{ margin: '10px' }}
                    onClick={() => privyLogout()}
                >
                    logout
                </Button>
            </Box>
        )
    }
}

const useStyles = makeStyles((theme: Theme) => ({
    container: {
        backgroundColor: theme.palette.common.white,
        borderRadius: '25px',
        padding: theme.spacing(8),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
}))
