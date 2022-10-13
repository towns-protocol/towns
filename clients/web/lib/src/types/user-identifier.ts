import { ethers } from 'ethers'

export interface UserIdentifier {
    readonly namespace: string
    readonly accountAddress: string
    readonly chainId: number
    readonly chainAgnosticId: string
    readonly matrixUserId: string | undefined
    readonly matrixUserIdLocalpart: string
    readonly serverName: string | undefined
}

export function createUserIdFromEthereumAddress(
    accountAddress: string,
    chainId: number,
): UserIdentifier {
    const checksumAddress = ethers.utils.getAddress(accountAddress)
    return {
        namespace: 'eip155',
        accountAddress: checksumAddress,
        chainId,
        // https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md
        chainAgnosticId: `eip155:${chainId}:${checksumAddress}`,
        // https://spec.matrix.org/v1.1/appendices/#user-identifiers
        matrixUserIdLocalpart: `eip155=3a${chainId}=3a${checksumAddress}`,
        matrixUserId: undefined,
        serverName: undefined,
    }
}

export function createUserIdFromString(matrixUserId: string): UserIdentifier | undefined {
    let namespace: string | undefined
    let chainId: number | undefined
    let accountAddress: string | undefined
    let serverName: string | undefined

    const regex = /^@(?<namespace>.*)=3a(?<chainId>.*)=3a(?<accountAddress>.*):(?<serverName>.*)/
    const match = regex.exec(matrixUserId)

    if (match) {
        namespace = match.groups?.namespace
        switch (namespace) {
            case 'eip155': {
                try {
                    chainId = match.groups?.chainId ? parseInt(match.groups?.chainId) : undefined
                    accountAddress = match.groups?.accountAddress
                    accountAddress = accountAddress
                        ? ethers.utils.getAddress(accountAddress)
                        : undefined
                    serverName = match.groups?.serverName
                } catch (e) {
                    console.error('createServerName failed WithError', e)
                }
                if (namespace && chainId && accountAddress && serverName) {
                    return {
                        namespace: 'eip155',
                        accountAddress,
                        chainId,
                        // https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md
                        chainAgnosticId: `eip155:${chainId}:${accountAddress}`,
                        // https://spec.matrix.org/v1.1/appendices/#user-identifiers
                        matrixUserIdLocalpart: `eip155=3a${chainId}=3a${accountAddress}`,
                        matrixUserId,
                        serverName,
                    }
                }
                break
            }
            // Todo: support other namespaces.
            default:
                break
        }
    }

    return undefined
}

export function getUsernameFromId(userId: string | undefined): string | undefined {
    if (userId) {
        const regexName = /^@(?<localpart>.*):/
        const match = regexName.exec(userId)
        const localpart = match?.groups?.localpart ?? undefined
        return localpart
    }

    return undefined
}

export function getShortUsername(userId: string): string {
    // Wallet address starts with 0x.....
    if (userId && userId.startsWith('0x') && userId.length === 42) {
        const last4 = userId.length - 4
        return `${userId.slice(0, 5)}....${userId.slice(last4)}`
    }
    return userId
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isUserIdentifier(userId: any): userId is UserIdentifier {
    if (userId) {
        const u = userId as UserIdentifier
        return (
            u.namespace !== undefined && u.accountAddress !== undefined && u.chainId !== undefined
        )
    }

    return false
}
