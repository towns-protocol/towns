import { useZionContext } from '../components/ZionContextProvider'

export const useMyUserId = () => {
    const context = useZionContext()
    return context.casablancaClient?.userId
}
