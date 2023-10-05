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
import {
    LoginStatus,
    useCasablancaStore,
    useMatrixStore,
    useWeb3Context,
    useZionClient,
} from 'use-zion-client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { makeStyles } from '@mui/styles'
import {
    useAccount,
    useConnect,
    useDisconnect,
    useEnsAvatar,
    useEnsName,
    useNetwork,
    useSwitchNetwork,
} from 'wagmi'
import { useEnvironment } from 'hooks/use-environment'
import { EnvironmentSelect } from './EnvironmentSelect'
import { ChainSwitchingButton } from './Buttons/ChainSwitchingButton'

const loginMsgToSign = `Click to sign in and accept the Harmony Terms of Service.`
const registerWalletMsgToSign = `Click to register and accept the Harmony Terms of Service.`

export function Login(): JSX.Element {
    const styles = useStyles()
    const [showError, setShowError] = useState<string | undefined>(undefined)
    const { getIsWalletRegisteredWithMatrix } = useZionClient()
    const { loginStatus: matrixLoginStatus, loginError: matrixLoginError } = useMatrixStore()
    const { loginError: casablancaLoginError } = useCasablancaStore()
    const { isConnected } = useWeb3Context()
    const [walletRegisteredWithMatrix, setWalletRegisteredWithMatrix] = useState<boolean>(false)

    const onCloseAlert = useCallback(function () {
        setShowError(undefined)
    }, [])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                if (matrixLoginStatus === LoginStatus.LoggedOut && isConnected) {
                    const isRegistered = await getIsWalletRegisteredWithMatrix()
                    if (!cancelled) {
                        setWalletRegisteredWithMatrix(isRegistered)
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
    }, [getIsWalletRegisteredWithMatrix, matrixLoginStatus, isConnected])

    useEffect(() => {
        if (matrixLoginError?.message) {
            setShowError(matrixLoginError.message)
        } else if (casablancaLoginError?.message) {
            setShowError(casablancaLoginError.message)
        } else {
            setShowError('')
        }
    }, [casablancaLoginError, matrixLoginError])

    return (
        <div className={styles.container}>
            <Box sx={{ display: 'grid' }}>
                <EnvironmentSelect />
                <WalletInfo />
                {isConnected && (
                    <NetworkInfo walletRegisteredWithMatrix={walletRegisteredWithMatrix} />
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

function NetworkInfo(props: { walletRegisteredWithMatrix: boolean }) {
    const { walletRegisteredWithMatrix } = props
    const { isConnected } = useWeb3Context()
    const { loginWithWalletToMatrix, registerWalletWithMatrix, loginWithWalletToCasablanca } =
        useZionClient()
    const { loginStatus: matrixLoginStatus } = useMatrixStore()
    const { loginStatus: casablancaLoginStatus } = useCasablancaStore()

    const onLoginWithWallet = useCallback(
        async function () {
            loginWithWalletToMatrix(loginMsgToSign)
        },
        [loginWithWalletToMatrix],
    )

    const onRegisterNewWallet = useCallback(
        async function () {
            registerWalletWithMatrix(registerWalletMsgToSign)
        },
        [registerWalletWithMatrix],
    )

    const onLoginCasablanca = useCallback(
        async function () {
            loginWithWalletToCasablanca(loginMsgToSign)
        },
        [loginWithWalletToCasablanca],
    )

    const registerButton = useMemo(() => {
        if (isConnected) {
            if (matrixLoginStatus === LoginStatus.Registering) {
                return <CircularProgress size={56} />
            } else if (matrixLoginStatus === LoginStatus.LoggedOut) {
                return (
                    <ChainSwitchingButton
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onRegisterNewWallet}
                    >
                        Register new wallet (matrix)
                    </ChainSwitchingButton>
                )
            } else {
                return (
                    <Typography variant="h6" component="span">
                        Matrix Login Status: {matrixLoginStatus}
                    </Typography>
                )
            }
        }
        return undefined
    }, [isConnected, matrixLoginStatus, onRegisterNewWallet])

    const casablancaButton = useMemo(() => {
        if (isConnected) {
            if (casablancaLoginStatus === LoginStatus.LoggingIn) {
                return <CircularProgress size={56} />
            } else if (casablancaLoginStatus === LoginStatus.LoggedOut) {
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
                        Casablanca Login Status: {casablancaLoginStatus}
                    </Typography>
                )
            }
        }
        return undefined
    }, [casablancaLoginStatus, isConnected, onLoginCasablanca])

    const signInButton = useMemo(() => {
        if (isConnected) {
            if (matrixLoginStatus === LoginStatus.LoggingIn) {
                return <CircularProgress size={56} />
            } else if (matrixLoginStatus === LoginStatus.LoggedOut) {
                return (
                    <ChainSwitchingButton
                        variant="contained"
                        color="primary"
                        sx={{ margin: '20px' }}
                        onClick={onLoginWithWallet}
                    >
                        Sign in with wallet
                    </ChainSwitchingButton>
                )
            } else {
                return (
                    <Typography variant="h6" component="span">
                        Matrix Login Status: {matrixLoginStatus}
                    </Typography>
                )
            }
        }
        return undefined
    }, [isConnected, matrixLoginStatus, onLoginWithWallet])

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
                    label="Matrix"
                    sx={{
                        borderRadius: 0,
                    }}
                />
                <Paper elevation={3} sx={{ padding: '20px' }}>
                    {!walletRegisteredWithMatrix && registerButton}
                    {walletRegisteredWithMatrix && signInButton}
                </Paper>
            </Box>
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
                    {casablancaButton}
                </Paper>
            </Box>
        </>
    )
}

function WalletInfo() {
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

    const { chainId: appChainId, chainName: appChainName, casablancaUrl } = useEnvironment()
    const { chain: walletChain } = useNetwork()
    const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
    const { disconnect } = useDisconnect()

    const { switchNetwork } = useSwitchNetwork({
        onSuccess: (chain) => {
            console.log('switched to network', chain)
        },
    })

    const onSwitchToAppChain = useCallback(() => {
        switchNetwork?.(appChainId)
    }, [appChainId, switchNetwork])

    useEffect(() => {
        console.log('Profile', {
            address,
            connector,
            isConnected,
            appChainName,
            walletChain,
        })
    }, [address, connector, isConnected, appChainName, walletChain])

    if (isConnected) {
        return (
            <>
                {walletChain?.id !== appChainId && (
                    <Box
                        display="grid"
                        alignItems="center"
                        gridTemplateColumns="repeat(2, 1fr)"
                        marginTop="20px"
                    >
                        <Typography variant="h6" component="span">
                            You are on the wrong chain. This environment requires you to be on{' '}
                            <b>{appChainName}</b>
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            sx={{ margin: '20px' }}
                            onClick={onSwitchToAppChain}
                        >
                            Switch to {appChainName}
                        </Button>
                    </Box>
                )}
                <Box sx={{ display: 'grid', marginTop: '20px', alignItems: 'Center' }}>
                    <Chip
                        label="Wallet"
                        sx={{
                            borderRadius: 0,
                        }}
                    />

                    <Paper elevation={3} sx={{ padding: '20px' }}>
                        {walletChain?.id === 1 && <ENSInfo address={address} />}

                        <Typography variant="h6" component="p">
                            {`Chain: ${walletChain?.name}`}
                        </Typography>
                        <Typography variant="h6" component="p" sx={{ marginTop: '20px' }}>
                            {`Remote Url: ${casablancaUrl}`}
                        </Typography>
                        <Typography variant="h6" component="p" sx={{ marginTop: '20px' }}>
                            {`Address: ${address}`}
                        </Typography>
                        <Typography variant="h6" component="p" sx={{ marginTop: '20px' }}>
                            Wallet Status: Connected to {connector?.name}
                        </Typography>

                        <Button
                            variant="outlined"
                            color="primary"
                            sx={{ margin: '20px' }}
                            onClick={() => disconnect()}
                        >
                            Disconnect Wallet
                        </Button>
                    </Paper>
                </Box>
            </>
        )
    }
    return (
        <Box
            display="grid"
            alignItems="center"
            gridTemplateColumns="repeat(2, 1fr)"
            marginTop="20px"
        >
            <Typography variant="h6" component="span">
                Connect with:
            </Typography>
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
        </Box>
    )
}

function ENSInfo(props: { address: `0x${string}` | undefined }): JSX.Element {
    const { address } = props
    const { data: ensName } = useEnsName({ address })
    const { data: ensAvatar } = useEnsAvatar({ name: ensName })

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
