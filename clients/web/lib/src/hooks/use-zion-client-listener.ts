import { MatrixEvent, MatrixScheduler } from 'matrix-js-sdk'
import { useCallback, useEffect, useRef, useState } from 'react'

import { LoginStatus } from './login'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { isMatrixError } from './use-zion-client'
import { MatrixCredentials, useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { useSigner } from 'wagmi'
import { useWeb3Context } from '../components/Web3ContextProvider'

export const useZionClientListener = (opts: ZionOpts) => {
    const { provider, chain } = useWeb3Context()
    const { setLoginStatus } = useMatrixStore()
    const { matrixCredentialsMap, setMatrixCredentials } = useCredentialStore()
    const matrixCredentials = matrixCredentialsMap[opts.matrixServerUrl]
    const [clientRef, setClientRef] = useState<ZionClient>()
    const clientSingleton = useRef<ZionClient>()
    const chainId = chain?.id
    const { data: wagmiSigner } = useSigner()
    const _signer = opts.web3Signer || wagmiSigner
    const _provider = opts.web3Provider || provider

    if (!clientSingleton.current) {
        if (_signer) {
            clientSingleton.current = new ZionClient(
                {
                    ...opts,
                    web3Provider: _provider,
                    web3Signer: _signer,
                },
                chainId,
            )
        }
    }

    const startClient = useCallback(async () => {
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
            setClientRef(undefined)
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
                console.warn('startClient: called again with same access token')
            }
            return
        }
        console.log('******* start client *******')
        // unset the client ref if it's not already, we need to cycle the ui
        setClientRef(undefined)
        // start it up!
        try {
            await startMatrixClientWithRetries(client, chainId, matrixCredentials)
            setClientRef(client)
            console.log('******* Matrix client listener started *******')
        } catch (e) {
            console.log('******* client encountered exception *******', e)
            try {
                await client.logout()
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

    useEffect(() => {
        void (async () => await startClient())()
    }, [startClient])

    return {
        client: clientRef,
        clientSingleton: clientSingleton.current,
    }
}

async function startMatrixClientWithRetries(
    client: ZionClient,
    chainId: number,
    matrixCredentials: MatrixCredentials,
): Promise<void> {
    const dummyMatrixEvent = new MatrixEvent()
    let retryCount = 0
    let isSuccess = false
    while (!isSuccess) {
        try {
            await client.startMatrixClient(
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
            isSuccess = true
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
