import { Alert, Box, Button, CircularProgress, Snackbar, Theme, Typography } from '@mui/material'
import { LoginStatus, useMatrixStore, useWeb3Context, useZionClient } from 'use-zion-client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { makeStyles } from '@mui/styles'
import { useAccount, useConnect, useDisconnect, useEnsAvatar, useEnsName, useNetwork } from 'wagmi'

const loginMsgToSign = `Click to sign in and accept the Harmony Terms of Service.`
const registerWalletMsgToSign = `Click to register and accept the Harmony Terms of Service.`

export function Login(): JSX.Element {
    const styles = useStyles()
    const [showError, setShowError] = useState<string | undefined>(undefined)
    const { getIsWalletIdRegistered, loginWithWallet, registerWallet } = useZionClient()
    const { loginStatus, loginError } = useMatrixStore()
    const { isConnected } = useWeb3Context()
    const { disconnect } = useDisconnect()

    const [walletRegistered, setWalletRegistered] = useState<boolean>(true)

    const onLoginWithWallet = useCallback(
        async function () {
            loginWithWallet(loginMsgToSign)
        },
        [loginWithWallet],
    )

    const onRegisterNewWallet = useCallback(
        async function () {
            registerWallet(registerWalletMsgToSign)
        },
        [registerWallet],
    )

    const onCloseAlert = useCallback(function () {
        setShowError(undefined)
    }, [])

    useEffect(() => {
        if (loginError?.message) {
            setShowError(loginError.message)
        } else {
            setShowError('')
        }
    }, [loginError])

    const registerButton = useMemo(() => {
        if (isConnected) {
            if (loginStatus === LoginStatus.Registering) {
                return <CircularProgress size={56} />
            } else if (loginStatus === LoginStatus.LoggedOut) {
                return (
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onRegisterNewWallet}
                    >
                        Register new wallet
                    </Button>
                )
            } else {
                return <div>login status: {loginStatus}</div>
            }
        }
        return undefined
    }, [isConnected, loginStatus, onRegisterNewWallet])

    const signInButton = useMemo(() => {
        if (isConnected) {
            if (loginStatus === LoginStatus.LoggingIn) {
                return <CircularProgress size={56} />
            } else if (loginStatus === LoginStatus.LoggedOut) {
                return (
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onLoginWithWallet}
                    >
                        Sign in with wallet
                    </Button>
                )
            } else {
                return <div>login status: {loginStatus}</div>
            }
        }
        return undefined
    }, [isConnected, loginStatus, onLoginWithWallet])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                if (loginStatus === LoginStatus.LoggedOut && isConnected) {
                    const isRegistered = await getIsWalletIdRegistered()
                    if (!cancelled) {
                        setWalletRegistered(isRegistered)
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (reason: any) {
                if (!cancelled) {
                    setShowError(reason)
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [getIsWalletIdRegistered, loginStatus, isConnected])

    return (
        <div className={styles.container}>
            <Box sx={{ display: 'grid' }}>
                <Profile />
                <Box
                    sx={{
                        display: 'grid',
                        marginTop: '20px',
                        alignItems: 'Center',
                    }}
                >
                    {!walletRegistered && registerButton}
                    {walletRegistered && signInButton}
                </Box>
                {isConnected && (
                    <Button
                        variant="outlined"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={() => disconnect()}
                    >
                        Disconnect Wallet
                    </Button>
                )}
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

export function Profile() {
    const onConnnectCb = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params: { address: any; connector: any; isReconnected: any }) => {
            console.log(
                'Login.tsx::onConnected',
                params.address,
                params.connector,
                params.isReconnected,
            )
        },
        [],
    )
    const onDisconnectCb = useCallback(() => {
        console.log('Login.tsx::onDisconnected')
    }, [])
    const { address, connector, isConnected } = useAccount({
        onConnect: onConnnectCb,
        onDisconnect: onDisconnectCb,
    })
    const { chain: activeChain, chains } = useNetwork()
    const { connect, connectors, error, isLoading, pendingConnector } = useConnect()

    console.log('!!Profile', {
        address,
        connector,
        isConnected,
        activeChain,
        chains,
    })

    if (isConnected) {
        return (
            <>
                {activeChain && (
                    <Box sx={{ display: 'grid', marginTop: '15px', alignItems: 'Center' }}>
                        <Typography variant="h6" component="span">
                            Chain: <q>{activeChain.name}</q> id: {activeChain.id}
                        </Typography>
                    </Box>
                )}
                {activeChain?.id === 1 && <ENSInfo address={address} />}
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        {`Address: ${address}`}
                    </Typography>
                </Box>
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        Status: Connected to {connector?.name}
                    </Typography>
                </Box>
            </>
        )
    }
    return (
        <div>
            Connect with
            {connectors.map((connector) => (
                <Button
                    variant="contained"
                    color="primary"
                    sx={{ margin: '10px' }}
                    disabled={!connector.ready}
                    key={connector.id}
                    onClick={() => connect({ connector })}
                >
                    {connector.name}
                    {!connector.ready && ' (unsupported)'}
                    {isLoading && connector.id === pendingConnector?.id && ' (connecting)'}
                </Button>
            ))}
            {error && <div>{error.message}</div>}
        </div>
    )
}

function ENSInfo(props: { address: `0x${string}` | undefined }): JSX.Element {
    const { address } = props
    const { data: ensAvatar } = useEnsAvatar({ addressOrName: address })
    const { data: ensName } = useEnsName({ address })

    return (
        <>
            {ensAvatar && (
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        {`ENS Avatar: ${ensAvatar}`}
                    </Typography>
                </Box>
            )}
            {ensName && (
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Typography variant="h6" component="span">
                        {`ENS Name: ${ensName}`}
                    </Typography>
                </Box>
            )}
        </>
    )
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
