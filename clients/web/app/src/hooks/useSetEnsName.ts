import { useTownsContext } from 'use-towns-client'

export const useSetEnsName = () => {
    const { casablancaClient } = useTownsContext()
    const setEnsName = async (streamId: string, ensAddress: string | undefined) => {
        return casablancaClient?.setEnsAddress(streamId, ensAddress ?? new Uint8Array())
    }
    return { setEnsName }
}
