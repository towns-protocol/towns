import { useCallback, useRef } from 'react'
import { useEmbeddedWallet } from './useEmbeddedWallet'
import { getSigner } from './getSigner'

async function waitFor<T>(
    condition: () => T | null | undefined,
    options: {
        timeout?: number
        interval?: number
        errorMsg?: string
    },
): Promise<T> {
    const { timeout = 5000, interval = 100, errorMsg = 'Timed out' } = options

    return new Promise((resolve, reject) => {
        const startTime = Date.now()

        const check = () => {
            const result = condition()
            if (result) {
                resolve(result)
            } else if (Date.now() - startTime >= timeout) {
                reject(new Error(errorMsg))
            } else {
                setTimeout(check, interval)
            }
        }

        check()
    })
}

export const useGetSignerWithTimeout = (args: { chainId: number; timeout?: number }) => {
    const { chainId, timeout } = args
    const _timeout = timeout ?? 10_000
    const { embeddedWallet } = useEmbeddedWallet()
    const embeddedWalletRef = useRef(embeddedWallet)
    if (embeddedWallet) {
        embeddedWalletRef.current = embeddedWallet
    }

    return useCallback(async () => {
        try {
            const wallet = await waitFor(
                () => {
                    const _embeddedWallet = embeddedWalletRef.current
                    if (!_embeddedWallet) {
                        return
                    }
                    return _embeddedWallet
                },
                {
                    timeout: _timeout,
                    errorMsg: 'Timed out waiting for embedded wallet',
                },
            )
            return await getSigner(wallet, chainId)
        } catch (error) {
            console.error('[useGetEmbeddedSigner]: Error fetching signer:', error)
        }
    }, [chainId, _timeout])
}
