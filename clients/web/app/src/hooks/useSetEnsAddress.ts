import { useTownsContext } from 'use-towns-client'

export const useSetEnsAddress = () => {
    const { casablancaClient } = useTownsContext()
    const setEnsAddress = async (streamId: string, ensAddress: string | undefined) => {
        return casablancaClient?.setEnsAddress(streamId, ensAddress ?? new Uint8Array())
    }
    return { setEnsAddress }
}
