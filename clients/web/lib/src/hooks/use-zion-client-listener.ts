import { useCallback, useEffect, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { ZionClient } from '../client/ZionClient'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { ZionOnboardingOpts, SpaceProtocol } from '../client/ZionClientTypes'
import { LoginStatus } from './login'
import { useSigner } from 'wagmi'

export const useZionClientListener = (
    primaryProtocol: SpaceProtocol,
    matrixServerUrl: string,
    casablancaServerUrl: string,
    initialSyncLimit: number,
    onboardingOpts?: ZionOnboardingOpts,
    signer?: ethers.Signer,
) => {
    const { provider, chain } = useWeb3Context()
    const { setLoginStatus } = useMatrixStore()
    const { matrixCredentialsMap, setMatrixCredentials } = useCredentialStore()
    const matrixCredentials = matrixCredentialsMap[matrixServerUrl]
    const [clientRef, setClientRef] = useState<ZionClient>()
    const clientSingleton = useRef<ZionClient>()
    const chainId = chain?.id
    const { data: wagmiSigner } = useSigner()

    if (!clientSingleton.current) {
        const _signer = signer || wagmiSigner
        if (_signer) {
            clientSingleton.current = new ZionClient(
                {
                    primaryProtocol,
                    matrixServerUrl,
                    casablancaServerUrl,
                    initialSyncLimit,
                    onboardingOpts,
                    web3Provider: provider,
                    web3Signer: _signer,
                },
                chainId,
            )
        }
    }

    const startClient = useCallback(async () => {
        if (!clientSingleton.current) {
            return
        }
        if (!matrixCredentials) {
            console.error('startClient: accessToken, userId, or deviceId is undefined')
            return
        }
        if (!chainId) {
            console.error('startClient: chainId is undefined')
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
            await client.startMatrixClient(
                {
                    userId: matrixCredentials.userId,
                    accessToken: matrixCredentials.accessToken,
                    deviceId: matrixCredentials.deviceId,
                },
                chainId,
            )
            setClientRef(client)
            console.log('******* client started *******')
        } catch (e) {
            console.log('******* client encountered exception *******', e)
            try {
                await client.logout()
            } catch (e) {
                console.log('error while logging out', e)
            }
            setLoginStatus(LoginStatus.LoggedOut)
            setMatrixCredentials(matrixServerUrl, null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        chainId,
        matrixCredentials,
        matrixServerUrl,
        setLoginStatus,
        setMatrixCredentials,
        wagmiSigner, // if signer is not passed in, clientSingleton.current will only be created if wagmiSigner, so we need to watch it
    ])

    useEffect(() => {
        if (matrixCredentials) {
            void (async () => await startClient())()
            console.log(`Matrix client listener started`)
        } else {
            setClientRef(undefined)
            console.log('Matrix client listener stopped')
        }
    }, [matrixCredentials, startClient])

    return {
        client: clientRef,
        clientSingleton: clientSingleton.current,
    }
}
