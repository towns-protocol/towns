import { useEffect, useLayoutEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback)

    // Remember the latest callback if it changes.
    useLayoutEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        // Don't schedule if no delay is specified.
        // Note: 0 is a valid value for delay.
        // To disable the interval, pass null instead.
        // This allows for a dynamic delay, or for the interval to be toggled on/off
        if (!delay && delay !== 0) {
            return
        }

        const id = setInterval(() => savedCallback.current(), delay)

        return () => clearInterval(id)
    }, [delay])
}
