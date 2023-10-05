import { useCallback, useEffect, useRef, useState } from 'react'
import { bin_fromHexString, Client as CasablancaClient, SignerContext } from '@river/sdk'
import { LoginStatus } from './login'
import { ZionClient } from '../client/ZionClient'
import { ZionOpts } from '../client/ZionClientTypes'
import { useCredentialStore } from '../store/use-credential-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useCasablancaStore } from '../store/use-casablanca-store'

export const useZionClientListener = (opts: ZionOpts) => {
    const { provider } = useWeb3Context()
    const { setLoginStatus: setCasablancaLoginStatus } = useCasablancaStore()
    const { casablancaCredentialsMap, setCasablancaCredentials } = useCredentialStore()
    const casablancaCredentials = casablancaCredentialsMap[opts.casablancaServerUrl ?? '']
    const [casablancaClient, setCasablancaClient] = useState<CasablancaClient>()
    const clientSingleton = useRef<ZionClient>()

    if (!clientSingleton.current) {
        clientSingleton.current = new ZionClient({
            ...opts,
            web3Provider: provider,
        })
    }

    const startCasablancaClient = useCallback(async () => {
        if (!clientSingleton.current || !casablancaCredentials) {
            console.log('casablanca client listener not yet started:', {
                singleton: clientSingleton.current !== undefined,
                casablancaCredentials: casablancaCredentials !== null,
            })
            setCasablancaClient(undefined)
            return
        }

        const client = clientSingleton.current
        const pk = casablancaCredentials.privateKey.slice(2)
        if (pk === client.signerContext?.signerPrivateKey()) {
            console.log('startCasablancaClient: called again with same access token')
            return
        }
        console.log('******* start casablanca client *******')
        // unset the client ref if it's not already, we need to cycle the ui
        setCasablancaClient(undefined)
        // start it up!
        // TODO(HNT-1380): transition to final signing model
        try {
            const context: SignerContext = {
                signerPrivateKey: () => pk,
                creatorAddress: bin_fromHexString(casablancaCredentials.creatorAddress),
                delegateSig: casablancaCredentials.delegateSig
                    ? bin_fromHexString(casablancaCredentials.delegateSig)
                    : undefined,
                deviceId: casablancaCredentials.deviceId,
            }
            const casablancaClient = await client.startCasablancaClient(context)
            setCasablancaClient(casablancaClient)
            setCasablancaLoginStatus(LoginStatus.LoggedIn)
            console.log('******* Casablanca client listener started *******')
        } catch (e) {
            console.log('******* casablanca client encountered exception *******', e)
            try {
                await client.logoutFromCasablanca()
            } catch (e) {
                console.log('error while logging out', e)
            }
            setCasablancaLoginStatus(LoginStatus.LoggedOut)
            setCasablancaCredentials(opts.casablancaServerUrl ?? '', null)
        }
    }, [
        casablancaCredentials,
        opts.casablancaServerUrl,
        setCasablancaCredentials,
        setCasablancaLoginStatus,
    ])

    useEffect(() => {
        void (async () => await startCasablancaClient())()
    }, [startCasablancaClient])

    return {
        client: casablancaClient ? clientSingleton.current : undefined,
        clientSingleton: clientSingleton.current,
        casablancaClient,
    }
}
