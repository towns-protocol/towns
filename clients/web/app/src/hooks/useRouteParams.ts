import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { RouteParams, getRouteParams } from 'routes/SpaceContextRoute'

export function useRouteParams(): RouteParams {
    const location = useLocation()
    const routeParams = useMemo(() => getRouteParams(location.pathname), [location])
    console.log('useRouteParams', routeParams)
    return routeParams
}
