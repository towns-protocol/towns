import { PATHS } from 'routes'

export const toPx = (value?: string | number) => (typeof value === 'number' ? `${value}px` : value)

export const notUndefined = <T>(x: T | undefined): x is T => {
    return typeof x !== 'undefined'
}

/**
 * Utility to assign default string values if the incoming value is a bool.
 */
export const assignBoolToDefaultValue = <T>(value: boolean | T, trueValue: T, falseValue?: T) => {
    return typeof value !== 'boolean' ? undefined : value === true ? trueValue : falseValue
}

export const shortAddress = (address: string) => {
    const start = address.slice(0, 5)
    const end = address.slice(-3)
    return `${start}...${end}`
}

export function isRejectionError(err: unknown): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return err !== undefined && (err as any).message?.code === 'ACTION_REJECTED'
}

export const isForbiddenError = (error: Error): boolean => {
    return error.name === 'M_FORBIDDEN'
}

export const getInviteUrl = (spaceId: string | undefined) =>
    `${window.location.protocol}//${window.location.host}/${PATHS.SPACES}/${spaceId}/?invite`

type Entries<T> = {
    [K in keyof T]: [K, T[K]]
}[keyof T][]

// same as Object.entries but with typed keys
export const getTypedEntries = <T extends object>(obj: T) => Object.entries(obj) as Entries<T>

// Supported name format for channel
export const ChannelNameRegExp = new RegExp(/^[a-zA-Z0-9 _-]+$/)
