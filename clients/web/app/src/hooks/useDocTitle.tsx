import { useCallback, useEffect } from 'react'

import { env } from '../utils/environment'

const FALLBACK = env.VITE_APP_NAME

export const useSetDocTitle = () => {
    const setTitle = useCallback((title?: string) => {
        if (!title) {
            document.title = FALLBACK
        } else {
            document.title = title
        }
    }, [])

    useEffect(() => {
        return () => {
            document.title = FALLBACK
        }
    }, [])

    return setTitle
}
