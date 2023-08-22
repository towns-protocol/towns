import { useEffect, useRef, useState } from 'react'

export const useThrottledValue = <T>(value: T, throttle: number) => {
    const tsRef = useRef<number>(0)
    const [throttledValue, setThrottledValue] = useState<T>(value)

    useEffect(() => {
        const ts = Date.now()
        const diff = ts - tsRef.current
        if (diff >= throttle) {
            tsRef.current = ts
            setThrottledValue(value)
        } else {
            // trailing edge
            const timeout = setTimeout(() => {
                tsRef.current = Date.now()
                setThrottledValue(value)
            }, throttle - diff)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [throttle, value])

    return throttledValue
}
