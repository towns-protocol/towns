import { Outlet, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { ConnectionBlock } from '@/components/blocks/connection'
import { UserStatusBlock } from '@/components/blocks/user-status'
import { SpacesBlock } from '@/components/blocks/spaces'

export const TLayout = () => {
    const navigate = useNavigate()

    const onSpaceChange = useCallback(
        (spaceId: string) => {
            navigate(`/t/${spaceId}`)
        },
        [navigate],
    )
    return (
        <div className="grid grid-cols-4 gap-4">
            <div className="grid grid-cols-subgrid gap-2">
                <ConnectionBlock />
                <UserStatusBlock />
            </div>
            <SpacesBlock changeSpace={onSpaceChange} />
            <Outlet />
        </div>
    )
}
