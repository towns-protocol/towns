import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { RouteParams, getRouteParams } from 'routes/SpaceContextRoute'

export function useRouteParams(): RouteParams {
    const { pathname } = useLocation()
    return useMemo(() => getRouteParams(pathname), [pathname])
}
