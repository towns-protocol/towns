import { useMemo } from 'react'
import isEqual from 'lodash/isEqual'
import { SpaceSettings } from 'store/spaceSettingsStore'

export type SpaceSettingsChange = {
    title: string
    description: string
}

export const useSpaceSettingChanges = (dst?: SpaceSettings, src?: SpaceSettings) => {
    const spaceSettingChanges = useMemo(() => {
        const changes: SpaceSettingsChange[] = []

        if (!src || !dst) {
            console.warn('space settings not comparable')
            return changes
        }

        // check fo removed roles
        src.roles?.reduce((changes, sr) => {
            const hasRole = dst.roles.some((r) => r.id === sr.id)
            if (!hasRole) {
                changes.push({
                    title: 'Role removed',
                    description: `${sr.name}`,
                })
            }
            return changes
        }, changes)

        // check for new roles
        dst.roles?.reduce((changes, r) => {
            const hasRole = src.roles.some((sr) => sr.id === r.id)
            if (!hasRole) {
                changes.push({
                    title: `Role added`,
                    description: `${r.name}`,
                })
            }
            return changes
        }, changes)

        // check for role updates
        dst.roles?.reduce((changes, r) => {
            const snapshotRole = src.roles.find((sr) => sr.id === r.id)
            const role = dst.roles.find((sr) => sr.id === r.id)
            if (role) {
                if (role.name !== snapshotRole?.name) {
                    changes.push({
                        title: `Role name updated`,
                        description: `${role.name}: ${role.name}`,
                    })
                }
                if (role.color !== snapshotRole?.color) {
                    changes.push({
                        title: `Role color updated`,
                        description: `${role.name}: ${role.color}`,
                    })
                }
                if (
                    !isEqual(
                        role.permissions.slice().sort(),
                        snapshotRole?.permissions.slice().sort(),
                    )
                ) {
                    changes.push({
                        title: `Role permissions updated`,
                        description: `${role.name}: ${role.permissions.join()}`,
                    })
                }
                if (!isEqual(role.tokens.slice().sort(), snapshotRole?.tokens.slice().sort())) {
                    changes.push({
                        title: `Role tokens updated`,
                        description: `Role tokens updated: ${role.name}`,
                    })
                }
                if (!isEqual(role.users.slice().sort(), snapshotRole?.users.slice().sort())) {
                    changes.push({
                        title: 'Role users updated',
                        description: `${role.name}: ${role.users.join()} users`,
                    })
                }
            }
            return changes
        }, changes)

        return changes
    }, [dst, src])

    return { spaceSettingChanges }
}
