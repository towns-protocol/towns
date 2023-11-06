import { useEffect, useLayoutEffect, useRef } from 'react'

type Callback = () => void | Promise<void>
export function useInterval(callback: Callback, delay: number | null) {
    const savedCallback = useRef<Callback>(callback)

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

        const id = setInterval(async () => {
            if (savedCallback.current) {
                await savedCallback.current()
            }
        }, delay)

        return () => clearInterval(id)
    }, [delay])
}
