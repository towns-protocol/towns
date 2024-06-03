import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'
import { RouteParams, getRouteParams } from 'routes/SpaceContextRoute'

export function useRouteParams(): RouteParams {
    const location = useLocation()
    const routeParams = useMemo(() => getRouteParams(location.pathname), [location])
    useEffect(() => {
        console.log('[useRouteParams][route]', routeParams)
    }, [routeParams])
    return routeParams
}
