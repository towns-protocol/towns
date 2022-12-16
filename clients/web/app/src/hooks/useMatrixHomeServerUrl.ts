import React, { useCallback } from 'react'
import { isDev } from 'utils'

const MATRIX_HOMESERVER_URL = 'MATRIX_HOMESERVER_URL'

export enum HomeServerUrl {
    LOCAL = 'http://localhost:8008',
    REMOTE = 'https://node1.zion.xyz',
}

export type UseHomeServerUrlReturn = ReturnType<typeof useMatrixHomeServerUrl>

export function useMatrixHomeServerUrl() {
    let URL = import.meta.env.VITE_MATRIX_HOMESERVER_URL

    if (isDev) {
        URL = localStorage.getItem(MATRIX_HOMESERVER_URL) || URL
    }

    const [homeserverUrl, _setHomerserverUrl] = React.useState(URL)

    const clearUrl = useCallback(() => {
        localStorage.removeItem(MATRIX_HOMESERVER_URL)
        _setHomerserverUrl(import.meta.env.VITE_MATRIX_HOMESERVER_URL)
    }, [])

    const setUrl = useCallback((url: HomeServerUrl) => {
        _setHomerserverUrl(url)
        localStorage.setItem(MATRIX_HOMESERVER_URL, url)
    }, [])

    const getUrl = useCallback(() => localStorage.getItem(MATRIX_HOMESERVER_URL), [])

    const hasUrl = useCallback(() => localStorage.getItem(MATRIX_HOMESERVER_URL) !== null, [])

    return {
        homeserverUrl,
        clearUrl,
        getUrl,
        hasUrl,
        setUrl,
    }
}
