import { env } from './environment'

export const hasQueryParam = (query: string) => {
    if (!env.DEV) {
        return false
    }
    return new URLSearchParams(window.location.search).get(query) != undefined
}
