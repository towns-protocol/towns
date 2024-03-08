import { useTownsContext } from 'use-towns-client'

export const useSetUsername = () => {
    const { casablancaClient } = useTownsContext()
    const setUsername = async (streamId: string, username: string) => {
        return casablancaClient?.setUsername(streamId, username)
    }
    return { setUsername }
}
