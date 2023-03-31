import isEqual from 'lodash/isEqual'
import { useMemo, useState } from 'react'
import { useMultipleRoleDetails, useRoleDetails, useRoles } from 'use-zion-client'
import { Role } from './store/hooks/settingsRolesStore'

export function useGetAllRoleDetails(spaceId: string) {
    const { spaceRoles: _roles } = useRoles(decodeURIComponent(spaceId))
    const roledIds = useMemo(() => _roles?.map((r) => r.roleId?.toNumber()) ?? [], [_roles])
    const [diffedRoles, setDiffedRoles] = useState<Role[] | undefined>()
    const {
        data: _rolesDetails,
        isLoading: detailsLoading,
        invalidateQuery,
    } = useMultipleRoleDetails(decodeURIComponent(spaceId), roledIds)

    const mappedRoles =
        _rolesDetails?.map(mapRoleStructToRole).filter((role): role is Role => !!role) ?? []

    // useRoles and useMultipleRoleDetails can fire a lot and return the same data
    // we only want to update if the data has actually changed
    if (mappedRoles && !isEqual(diffedRoles, mappedRoles)) {
        setDiffedRoles(mappedRoles)
    }

    return useMemo(() => {
        return {
            data: diffedRoles,
            isLoading: detailsLoading,
            invalidateQuery,
        }
    }, [detailsLoading, invalidateQuery, diffedRoles])
}

function mapRoleStructToRole(
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails'],
): Role | undefined {
    if (!roleDetails) {
        return
    }
    return {
        id: roleDetails.id.toString(),
        name: roleDetails.name,
        permissions: roleDetails.permissions,
        tokens: roleDetails.tokens.map((t) => t.contractAddress as string),
        users: roleDetails.users,
    }
}
