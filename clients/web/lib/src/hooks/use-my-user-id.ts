import { useZionContext } from '../components/ZionContextProvider'

export function useMyUserId() {
    const { client } = useZionContext()
    const userId = client?.getUserId()
    return userId
}
