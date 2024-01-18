import React, { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { SECOND_MS } from 'data/constants'
import { useStore } from 'store/store'

export const ShakeToReport = () => {
    const { sidePanel, setSidePanel } = useStore(({ sidePanel, setSidePanel }) => ({
        sidePanel,
        setSidePanel,
    }))

    useCheckPermission()

    useShakeDetection(
        useCallback(() => {
            if (sidePanel !== 'bugReport') {
                setSidePanel('bugReport')
            }
        }, [setSidePanel, sidePanel]),
    )
    return <></>
}

const useShakeDetection = (onShake: () => void) => {
    const permissionStatus = useShakeStore((state) => state.permissionStatus)
    useEffect(() => {
        if (permissionStatus !== 'granted') {
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
    }, [onShake, permissionStatus])
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

const useCheckPermission = () => {
    const { permissionStatus, setPermissionStatus } = useShakeStore(
        ({ permissionStatus, setPermissionStatus }) => ({
            permissionStatus,
            setPermissionStatus,
        }),
    )
    useEffect(() => {
        if (permissionStatus === 'checking') {
            const onDeviceMotion = (e: DeviceMotionEvent) => {
                setPermissionStatus('granted')
            }
            window.addEventListener('devicemotion', onDeviceMotion)
            return () => {
                window.removeEventListener('devicemotion', onDeviceMotion)
            }
        }
    }, [permissionStatus, setPermissionStatus])

    useEffect(() => {
        if (permissionStatus === 'checking') {
            const timeout = setTimeout(() => {
                setPermissionStatus('denied')
            }, SECOND_MS * 10)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [permissionStatus, setPermissionStatus])

    useEffect(() => {
        console.log('status', permissionStatus)
    }, [permissionStatus])
}

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    requestPermission?: () => Promise<'granted' | 'denied'>
}

const isDeviceOrientationEventiOS = (event: unknown): event is DeviceOrientationEventiOS =>
    typeof (event as DeviceOrientationEventiOS)?.requestPermission === 'function'

export const useRequestShakePermissions = () => {
    const { permissionStatus, setPermissionStatus } = useShakeStore(
        ({ permissionStatus, setPermissionStatus }) => ({ permissionStatus, setPermissionStatus }),
    )
    const requestPermission = useCallback(async () => {
        if (isDeviceOrientationEventiOS(DeviceOrientationEvent)) {
            const response = await DeviceOrientationEvent.requestPermission?.()
            if (response == 'granted' || response == 'denied') {
                setPermissionStatus(response)
            }
        }
    }, [setPermissionStatus])

    const revokePermission = useCallback(() => {
        setPermissionStatus('denied')
    }, [setPermissionStatus])

    return { permissionStatus, requestPermission, revokePermission }
}

export const useShakeStore = create<{
    permissionStatus: 'checking' | 'denied' | 'granted'
    setPermissionStatus: (permissionStatus: 'checking' | 'denied' | 'granted') => void
}>((set) => ({
    permissionStatus: 'checking',
    setPermissionStatus: (permissionStatus) => {
        set({ permissionStatus })
    },
}))
