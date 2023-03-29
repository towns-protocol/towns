import { useCallback, useEffect, useRef, useState } from 'react'
import { MatrixClient, MatrixEvent, MatrixScheduler } from 'matrix-js-sdk'
import { Client as CasablancaClient, SignerContext } from '@towns/client'
import { LoginStatus } from './login'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { isMatrixError } from './use-zion-client'
import { MatrixCredentials, useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { useSigner } from 'wagmi'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { ethers } from 'ethers'

export const useZionClientListener = (opts: ZionOpts) => {
    const { provider, chain } = useWeb3Context()
    const { setLoginStatus } = useMatrixStore()
    const { matrixCredentialsMap, setMatrixCredentials, casablancaCredentialsMap } =
        useCredentialStore()
    const matrixCredentials = matrixCredentialsMap[opts.matrixServerUrl]
    const casablancaCredentials = casablancaCredentialsMap[opts.casablancaServerUrl]
    const [matrixClient, setMatrixClient] = useState<MatrixClient>()
    const [casablancaClient, setCasablancaClient] = useState<CasablancaClient>()
    const clientSingleton = useRef<ZionClient>()
    // The chain is an optional prop the consuming client can pass to the ZionContextProvider
    // If passed, we lock ZionClient to that chain
    const chainId = chain?.id
    // Additionally, The signer should be initialized with the correct chainId so we don't have to worry about it changing for writes
    // without this, when a user swaps networks and tries to make a transaction, they can have a mismatched signer resulting in "network changed" errors
    // TBD, we may want to add a ZionClient.createShims() that will recreate the spaceDapp shims with updated signer and provider, and call it here when those props change, but setting the signer chain may be enough
    const { data: wagmiSigner } = useSigner({
        chainId,
    })
    // web3Signer is passed by tests
    const _signer = opts.web3Signer || wagmiSigner

    if (!clientSingleton.current) {
        if (_signer) {
            clientSingleton.current = new ZionClient(
                {
                    ...opts,
                    web3Provider: provider,
                    web3Signer: _signer,
                },
                chainId,
            )
        }
    }

    const startMatrixClient = useCallback(async () => {
        if (!clientSingleton.current || !matrixCredentials || !chainId) {
            console.log(
                'Matrix client listener not started: clientSingleton.current, chainId, accessToken, userId, or deviceId is undefined.',
                {
                    singleton: clientSingleton.current !== undefined,
                    matrixCredentials: matrixCredentials !== null,
                    chainId: chainId !== undefined,
                    _signer: _signer !== undefined,
                },
            )
            setMatrixClient(undefined)
            return
        }
        // in the standard flow we should already be logged in, but if we're loading
        // credentials from local host, this aligns the login status with the credentials
        setLoginStatus(LoginStatus.LoggedIn)
        const client = clientSingleton.current
        // make sure we're not re-starting the client
        if (client.auth?.accessToken === matrixCredentials.accessToken) {
            if (client.chainId != chainId) {
                console.warn("ChainId changed, we're not handling this yet")
            } else {
                console.log('startMatrixClient: called again with same access token')
            }
            return
        }
        console.log('******* start client *******')
        // unset the client ref if it's not already, we need to cycle the ui
        setMatrixClient(undefined)
        // start it up!
        try {
            const matrixClient = await startMatrixClientWithRetries(
                client,
                chainId,
                matrixCredentials,
            )
            setMatrixClient(matrixClient)
            console.log('******* Matrix client listener started *******')
        } catch (e) {
            console.log('******* client encountered exception *******', e)
            try {
                await client.logoutFromMatrix()
            } catch (e) {
                console.log('error while logging out', e)
            }
            setLoginStatus(LoginStatus.LoggedOut)
            setMatrixCredentials(opts.matrixServerUrl, null)
        }
    }, [
        matrixCredentials,
        chainId,
        opts.matrixServerUrl,
        setLoginStatus,
        setMatrixCredentials,
        _signer,
    ])

    const startCasablancaClient = useCallback(async () => {
        if (!clientSingleton.current || !casablancaCredentials) {
            console.log('casablanca client listener not yet started:', {
                singleton: clientSingleton.current !== undefined,
                casablancaCredentials: casablancaCredentials !== null,
                chainId: chainId !== undefined,
                _signer: _signer !== undefined,
            })
            setCasablancaClient(undefined)
            return
        }

        const client = clientSingleton.current
        if (casablancaCredentials.privateKey === client.signerContext?.wallet.privateKey) {
            if (client.chainId != chainId) {
                console.warn("ChainId changed, we're not handling this yet")
            } else {
                console.log('startMatrixClient: called again with same access token')
            }
        }
        console.log('******* start casablanca client *******')
        // unset the client ref if it's not already, we need to cycle the ui
        setCasablancaClient(undefined)
        // start it up!
        try {
            const wallet = new ethers.Wallet(casablancaCredentials.privateKey)
            const context: SignerContext = {
                wallet,
                creatorAddress: casablancaCredentials.creatorAddress,
                delegateSig: casablancaCredentials.delegateSig,
            }
            const casablancaClient = await client.startCasablancaClient(context)
            setCasablancaClient(casablancaClient)
            console.log('******* Casablanca client listener started *******')
        } catch (e) {
            console.log('******* casablanca client encountered exception *******', e)
            try {
                await client.logoutFromCasablanca()
            } catch (e) {
                console.log('error while logging out', e)
            }
        }
    }, [_signer, casablancaCredentials, chainId])

    useEffect(() => {
        void (async () => await startMatrixClient())()
    }, [startMatrixClient])

    useEffect(() => {
        void (async () => await startCasablancaClient())()
    }, [startCasablancaClient])

    return {
        client: matrixClient || casablancaClient ? clientSingleton.current : undefined,
        clientSingleton: clientSingleton.current,
        matrixClient,
        casablancaClient,
    }
}

async function startMatrixClientWithRetries(
    client: ZionClient,
    chainId: number,
    matrixCredentials: MatrixCredentials,
): Promise<MatrixClient | undefined> {
    const dummyMatrixEvent = new MatrixEvent()
    let retryCount = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            const matrixClient = await client.startMatrixClient(
                {
                    userId: matrixCredentials.userId,
                    accessToken: matrixCredentials.accessToken,
                    deviceId: matrixCredentials.deviceId,
                },
                chainId,
            )
            if (retryCount > 0) {
                console.log(`startMatrixClientWithRetries succeeded after ${retryCount} retries`)
            }
            // succeeded, return
            return matrixClient
        } catch (err) {
            if (isMatrixError(err)) {
                const retryDelay = MatrixScheduler.RETRY_BACKOFF_RATELIMIT(
                    dummyMatrixEvent,
                    Math.max(retryCount, 4), // don't ever want to bail if this is a legit error, signing out will clear the cache
                    err,
                )
                console.log(`MatrixError`, {
                    retryDelay,
                    retryCount,
                    code: err.errcode,
                    data: err.data,
                    err,
                })
                if (retryDelay >= 0) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                    retryCount++
                    console.log('Retrying startMatrixClientWithRetries after delay: ', {
                        retryDelay,
                        retryCount,
                    })
                } else {
                    throw err
                }
            } else {
                // Not a MatrixError, just give up
                console.error('Not a MatrixError', err)
                throw err
            }
        }
    }
}
