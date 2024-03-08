import { useCallback } from 'react'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'

export function useResetFullyReadMarkers() {
    return useCallback(() => {
        console.log('useResetFullyReadMarkers::resetting fully read markers')
        useFullyReadMarkerStore.setState({ markers: {} })
    }, [])
}
