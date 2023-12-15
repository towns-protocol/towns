import { useZionContext } from 'use-zion-client'

export const useSetUsername = () => {
    const { casablancaClient } = useZionContext()
    const setUsername = async (streamId: string, username: string) => {
        return casablancaClient?.setUsername(streamId, username)
    }
    return { setUsername }
}
