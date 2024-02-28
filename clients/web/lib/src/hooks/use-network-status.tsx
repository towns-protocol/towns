import { useEffect, useState } from 'react'

export const useNetworkStatus = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    useEffect(() => {
        const onOnlineStatusChange = () => {
            setIsOffline(!navigator.onLine)
        }
        window.addEventListener('online', onOnlineStatusChange)
        window.addEventListener('offline', onOnlineStatusChange)
        return () => {
            window.removeEventListener('online', onOnlineStatusChange)
            window.removeEventListener('offline', onOnlineStatusChange)
        }
    }, [])
    return { isOffline }
}
