import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useRoles } from 'use-zion-client'
import { PATHS } from 'routes'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useSettingsRolesStore } from './store/hooks/settingsRolesStore'

// b/c of the route architecture, user navigates to /settings first,
// then we need to navigate one time to the first fetched role
export function NavigateToFirstRoleOnEntry({
    fetchedRolesLoading,
}: {
    fetchedRolesLoading: boolean
}) {
    const modifiedSpace = useSettingsRolesStore((state) => state.modifiedSpace)
    const defaultPath = useDefaultPath()
    const navigate = useNavigate()
    const hasNavigated = useRef(false)

    useEffect(() => {
        if (defaultPath && !hasNavigated.current) {
            hasNavigated.current = true
            navigate(defaultPath)
        }
    }, [defaultPath, navigate, modifiedSpace, fetchedRolesLoading])

    return null
}

export function useDefaultPath() {
    const spaceId = useSpaceIdFromPathname()
    const { spaceRoles: _roles, isLoading } = useRoles(decodeURIComponent(spaceId ?? ''))

    return useMemo(() => {
        if (isLoading || !_roles) {
            return undefined
        }

        const firstRole = _roles[0]
        if (!firstRole) {
            return `${PATHS.ROLES}/empty/permissions`
        }

        return `${PATHS.ROLES}/${firstRole.roleId.toNumber()}/permissions`
    }, [isLoading, _roles])
}
