import React, { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

export const ShakeToReport = () => {
    const { openPanel, isPanelOpen } = usePanelActions()

    const openBugReport = useCallback(() => {
        if (isPanelOpen('bug-report')) {
            return
        }
        openPanel('bug-report')
    }, [isPanelOpen, openPanel])

    useShakeDetection(openBugReport)
    return <></>
}

const useShakeDetection = (onShake: () => void) => {
    const enabled = useShakeStore((state) => state.enabled)
    useEffect(() => {
        if (!enabled) {
            return
        }
        const lastAcceleration = { x: 0, y: 0, z: 0 }
        const threshold = 15

        const onDeviceMotion = (e: DeviceMotionEvent) => {
            const acceleration = e.accelerationIncludingGravity
            if (!isAcceleration(acceleration)) {
                return
            }

            const { x, y, z } = acceleration

            const dx = getDelta(lastAcceleration.x, x)
            const dy = getDelta(lastAcceleration.y, y)
            const dz = getDelta(lastAcceleration.z, z)

            if (isShake(dx, dy, dz, threshold)) {
                onShake()
            }

            lastAcceleration.x = x
            lastAcceleration.y = y
            lastAcceleration.z = z
        }
        window.addEventListener('devicemotion', onDeviceMotion)
        return () => {
            window.removeEventListener('devicemotion', onDeviceMotion)
        }
    }, [enabled, onShake])
}

const isAcceleration = (
    acceleration: DeviceMotionEventAcceleration | null,
): acceleration is { x: number; y: number; z: number } => {
    if (!acceleration) {
        return false
    }
    const { x, y, z } = acceleration
    return !(typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number')
}

const getDelta = (a: number, b: number): number => {
    return Math.abs(a - b)
}

const isShake = (dx: number, dy: number, dz: number, threshold: number): boolean => {
    return (
        (dx > threshold && dy > threshold) ||
        (dx > threshold && dz > threshold) ||
        (dy > threshold && dz > threshold)
    )
}

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
}

const isDeviceOrientationEventiOS = (event: unknown): event is DeviceOrientationEventiOS =>
    typeof (event as DeviceOrientationEventiOS)?.requestPermission === 'function'

export const useRequestShakePermissions = () => {
    const { enabled, setEnabled } = useShakeStore(({ enabled, setEnabled }) => ({
        enabled,
        setEnabled,
    }))
    const requestPermission = useCallback(async () => {
        if (isDeviceOrientationEventiOS(DeviceOrientationEvent)) {
            const response = await DeviceOrientationEvent.requestPermission?.()
            if (response === 'granted') {
                setEnabled(true)
            } else {
                setEnabled(false)
            }
        } else {
            // Android does not require permission
            setEnabled(true)
        }
    }, [setEnabled])

    const revokePermission = useCallback(() => {
        setEnabled(false)
    }, [setEnabled])

    return { enabled, requestPermission, revokePermission }
}

export const useShakeStore = create(
    persist<{
        enabled: boolean
        setEnabled: (enabled: boolean) => void
    }>(
        (set) => ({
            enabled: false,
            setEnabled: (enabled: boolean) => set({ enabled }),
        }),
        {
            name: 'shake-to-report',
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
