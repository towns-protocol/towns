import { useTownsContext } from '../components/TownsContextProvider'

export const useMyUserId = () => {
    const context = useTownsContext()
    return context.casablancaClient?.userId
}
