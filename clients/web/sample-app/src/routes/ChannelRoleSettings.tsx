import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRoles } from 'use-towns-client'

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
    const { spaceRoles } = useRoles(props.spaceId)

    useEffect(
        function () {
            async function load() {
                const initialRoles: RolesSettings = {}
                if (spaceRoles) {
                    for (const r of spaceRoles) {
                        initialRoles[r.name] = {
                            name: r.name,
                            isSelected: true,
                        }
                    }
                }
                setRoles(initialRoles)
                console.log('initialRoles', initialRoles)
            }

            load()
        },
        [props.spaceId, spaceRoles],
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
                        <input
                            key={r}
                            type="checkbox"
                            name={r}
                            value={r}
                            checked={roles[r].isSelected}
                            onChange={onChangeRole}
                        />
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
