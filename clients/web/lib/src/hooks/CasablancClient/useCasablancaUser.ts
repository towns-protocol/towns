import { Client as CasablancaClient } from '@zion/client'
import { User } from '../../types/zion-types'

export function useCasablancaUser(userId?: string, client?: CasablancaClient): User | undefined {
    // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
    if (!userId || !client) {
        return undefined
    }
    return undefined
}
