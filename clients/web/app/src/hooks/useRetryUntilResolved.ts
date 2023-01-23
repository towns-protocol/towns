import React from 'react'
import { useInterval } from './useInterval'

// useRetryUntilResolved will call the callback function until it returns true, or until the optional waitFor milliseconds have passed
export function useRetryUntilResolved(callback: () => boolean, interval = 100, waitFor?: number) {
    const [hasResolved, setHasResolved] = React.useState(false)
    const timeRef = React.useRef(Date.now())

    useInterval(
        () => {
            const result = callback()
            if (waitFor) {
                if (result || timeRef.current + waitFor < Date.now()) {
                    setHasResolved(true)
                }
            } else if (result) {
                setHasResolved(true)
            }
        },
        // once hasResolved, the interval is turned off
        hasResolved ? null : interval,
    )

    return hasResolved
}
