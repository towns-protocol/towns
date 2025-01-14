import { LinkedAccountWithMetadata } from '@privy-io/server-auth'

export type LinkedAccountType = {
    type: LinkedAccountWithMetadata['type']
    identifier: string | undefined
}
