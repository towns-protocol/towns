import { useEffect, useState } from 'react'

export function useDocumentHidden() {
    const [hidden, setHidden] = useState(document.hidden)

    useEffect(() => {
        function handleVisibilityChange() {
            setHidden(document.hidden)
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    return hidden
}
