import { useCallback, useEffect } from 'react'

const FALLBACK = 'TOWNS'

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
