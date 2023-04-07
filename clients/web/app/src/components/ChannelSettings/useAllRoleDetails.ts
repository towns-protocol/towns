import isEqual from 'lodash/isEqual'
import { useMemo, useState } from 'react'
import { useMultipleRoleDetails, useRoles } from 'use-zion-client'
import { RoleDetails } from 'use-zion-client/dist/client/web3/ContractTypes'

// TODO: add this to useGetAllRoleDetails
export function useAllRoleDetails(spaceId: string) {
    const { spaceRoles: _roles, isLoading: rolesLoading } = useRoles(decodeURIComponent(spaceId))
    const roledIds = useMemo(() => _roles?.map((r) => r.roleId?.toNumber()) ?? [], [_roles])
    const [diffedRoles, setDiffedRoles] = useState<RoleDetails[] | undefined>()
    const {
        data: _rolesDetails,
        isLoading: detailsLoading,
        invalidateQuery,
    } = useMultipleRoleDetails(decodeURIComponent(spaceId), roledIds)

    // useRoles and useMultipleRoleDetails can fire a lot and return the same data
    // we only want to update if the data has actually changed
    if (!isEqual(diffedRoles, _rolesDetails)) {
        setDiffedRoles(_rolesDetails)
    }

    return useMemo(() => {
        return {
            data: diffedRoles,
            isLoading: rolesLoading || detailsLoading,
            invalidateQuery,
        }
    }, [detailsLoading, rolesLoading, invalidateQuery, diffedRoles])
}
