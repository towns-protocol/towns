import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntegratedSpaceManagement } from 'use-zion-client'

interface Role {
    name: string
    isSelected: boolean
}

export interface RolesSettings {
    [name: string]: Role
}

interface Props {
    spaceId: string
    onChangeValue: (roles: RolesSettings) => void
}

export function ChannelRoleSettings(props: Props): JSX.Element {
    const [roles, setRoles] = useState<RolesSettings>({})
    const { getRolesFromSpace } = useIntegratedSpaceManagement()

    useEffect(
        function () {
            async function load() {
                const rolesFromSpace = await getRolesFromSpace(props.spaceId)
                const initialRoles: RolesSettings = {}
                if (rolesFromSpace) {
                    for (const r of rolesFromSpace) {
                        initialRoles[r.name] = {
                            name: r.name,
                            isSelected: false,
                        }
                    }
                }
                setRoles(initialRoles)
                console.log('initialRoles', initialRoles)
            }

            load()
        },
        [getRolesFromSpace, props.spaceId],
    )

    const onChangeRole = useCallback(
        function (event: React.ChangeEvent<HTMLInputElement>): void {
            //console.log(`onChangeValue: ${event.target.value}, checked: ${event.target.checked}`)
            const newRoles = { ...roles }
            newRoles[event.target.value] = {
                name: event.target.value,
                isSelected: event.target.checked,
            }
            setRoles(newRoles)
            props.onChangeValue(newRoles)
            //console.log(`onChangeRole newRoles: ${JSON.stringify(newRoles)}`)
        },
        [props, roles],
    )

    const checkBoxes = useMemo(
        function () {
            const checkBoxes = []
            for (const r in roles) {
                checkBoxes.push(
                    <div key={r}>
                        <input key={r} type="checkbox" name={r} value={r} onChange={onChangeRole} />
                        <label>{r}</label>
                    </div>,
                )
            }
            console.log(`checkBoxes roles: ${JSON.stringify(roles)}`)
            return checkBoxes
        },
        [onChangeRole, roles],
    )

    return (
        <div onChange={onChangeRole}>
            <fieldset>
                <legend>Role(s)</legend>
                {checkBoxes}
            </fieldset>
        </div>
    )
}
