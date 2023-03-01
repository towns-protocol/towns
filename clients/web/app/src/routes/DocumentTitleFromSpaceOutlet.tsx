import React, { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { Outlet } from 'react-router'
import capitalize from 'lodash/capitalize'
import { PATHS } from 'routes'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { useSetDocTitle } from 'hooks/useDocTitle'

export const DocumentTitleFromSpaceOutlet = () => {
    const { serverSpace: space, chainSpace } = useContractAndServerSpaceData()
    const setTitle = useSetDocTitle()

    const location = useLocation()

    useEffect(() => {
        const spaceName = space?.name || chainSpace?.name
        if (!spaceName) {
            return
        }

        const childSpacePath = matchPath(`${PATHS.SPACES}/:spaceSlug/:child/*`, location.pathname)

        const channelPath = matchPath(
            `${PATHS.SPACES}/:spaceSlug/channels/:channelId`,
            location.pathname,
        )

        let title

        if (channelPath?.params.channelId) {
            if (space) {
                const channels = space.channelGroups.flatMap((g) => g.channels)
                const channelName = channels.find(
                    (c) => c.id.networkId === channelPath.params.channelId,
                )?.label
                title = `${space.name} ${channelName ? `| ${channelName}` : ''}`
            }
        } else {
            if (location.search.includes('invite')) {
                title = `Join ${spaceName}`
            } else {
                const childName = childSpacePath?.params.child
                    ? capitalize(childSpacePath.params.child)
                    : ''
                title = `${spaceName} ${childName ? `| ${childName}` : ''}`
            }
        }

        setTitle(title)
    }, [chainSpace?.name, location, setTitle, space])

    return <Outlet />
}
