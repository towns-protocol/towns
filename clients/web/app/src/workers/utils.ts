import { htmlToText } from 'html-to-text'
import { User } from './types'

// TODO: should we use this to only show notifications when the tab is not visible?
export async function checkClientIsVisible(worker: ServiceWorkerGlobalScope): Promise<boolean> {
    // https://github.com/microsoft/TypeScript/issues/14877
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const windowClients = await worker.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
    })

    for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].visibilityState === 'visible') {
            return true
        }
    }

    return false
}

export function getShortenedName(name: string | undefined): string | undefined {
    if (!name) {
        return undefined
    }

    // first check if the name matches the pattern we're looking for
    const matchSuffix = name.match(/\s+\(@eip[a-z0-9=]+(0x[0-9a-f]{40}):.+\)$/)

    // If name is an address, shorten it
    let shortenedName = name
    if (!matchSuffix) {
        const matchAddress = name.match(/0x[0-9a-fA-F]{40}/)
        if (matchAddress) {
            shortenedName = shortAddress(name)
        } else {
            shortenedName = name.length > 20 ? name.slice(0, 20) + '…' : name
        }
    }
    return shortenedName
}

export const shortAddress = (address: string) => {
    const start = address.slice(0, 5)
    const end = address.slice(-3)
    return `${start}...${end}`
}

export function stringHasValue(s: string | undefined): boolean {
    return s !== undefined && s.length > 0
}

export function preferredUsername(user: User): string {
    // in order of preference: displayName -> username -> userId
    return stringHasValue(user.displayName)
        ? user.displayName
        : stringHasValue(user.username)
        ? user.username
        : user.userId
}

/** Remove all MD formatting and unescape HTML to show in notifications */
export function decodeHtmltoText(data?: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        if (!data) {
            return resolve(undefined)
        }

        const parsedString = htmlToText(data)
        resolve(parsedString)
    })
}
