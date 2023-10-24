import { useCallback, useEffect } from 'react'
import { APP_NAME } from 'data/constants'

const FALLBACK = APP_NAME

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
