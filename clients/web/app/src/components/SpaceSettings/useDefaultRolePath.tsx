import { useMemo } from 'react'
import { useRoles } from 'use-zion-client'
import { PATHS } from 'routes'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'

export function useDefaultRolePath() {
    const spaceId = useSpaceIdFromPathname()
    const { spaceRoles: _roles, isLoading } = useRoles(decodeURIComponent(spaceId ?? ''))
    const rolesPath = `${PATHS.SPACES}/${spaceId}/${PATHS.SETTINGS}/${PATHS.ROLES}`

    return useMemo(() => {
        if (isLoading || !_roles) {
            return undefined
        }

        const firstRole = _roles[0]
        if (!firstRole) {
            return `/${rolesPath}/empty/permissions`
        }

        return `/${rolesPath}/${firstRole.roleId}/permissions`
    }, [isLoading, _roles, rolesPath])
}
