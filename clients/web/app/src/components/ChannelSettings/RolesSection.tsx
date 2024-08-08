import React, { useEffect } from 'react'
import { FieldValues, Path, PathValue, UseFormRegister, UseFormReturn } from 'react-hook-form'
import { RoleDetails } from 'use-towns-client'
import { Box, Checkbox, Icon, Text } from '@ui'
import { TokenCheckboxLabel } from '@components/Tokens/TokenCheckboxLabel'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { PanelButton } from '@components/Panel/PanelButton'

export interface RoleCheckboxProps extends RoleDetails {
    channelHasRole: boolean
    tokenAddresses: string[]
}

export function getCheckedValuesForRoleIdsField(rolesWithDetails: RoleCheckboxProps[]) {
    return rolesWithDetails.filter((r) => r.channelHasRole).map((r) => r.id.toString())
}

export function RolesSection<HookFormValues extends FieldValues>(props: {
    spaceId: string
    fieldName: Path<HookFormValues>
    rolesWithDetails: RoleCheckboxProps[]
    register: UseFormRegister<HookFormValues>
    resetField: UseFormReturn<HookFormValues>['resetField']
}) {
    const { rolesWithDetails, resetField, register, spaceId, fieldName } = props
    const { openPanel } = usePanelActions()

    useEffect(() => {
        resetField(fieldName, {
            defaultValue: getCheckedValuesForRoleIdsField(rolesWithDetails) as PathValue<
                HookFormValues,
                Path<HookFormValues>
            >,
        })
    }, [fieldName, resetField, rolesWithDetails])

    return (
        <>
            <Box paddingY="sm">
                <Text strong>Which roles have access to this channel</Text>
            </Box>
            {rolesWithDetails?.map((role) => {
                return (
                    <RoleDetailsComponent
                        key={role.id}
                        spaceId={spaceId}
                        role={role}
                        fieldName={fieldName}
                        register={register}
                    />
                )
            })}
            <PanelButton onClick={() => openPanel(CHANNEL_INFO_PARAMS.ROLES)}>
                <Icon type="plus" /> Create new role
            </PanelButton>
        </>
    )
}

function RoleDetailsComponent<HookFormValues extends FieldValues>(props: {
    fieldName: Path<HookFormValues>
    spaceId: string
    role: RoleCheckboxProps
    register: UseFormRegister<HookFormValues>
}): JSX.Element {
    return (
        <Box padding="md" background="level2" borderRadius="sm" key={props.role.id}>
            <Checkbox
                width="100%"
                name={props.fieldName}
                label={
                    <TokenCheckboxLabel
                        label={props.role.name}
                        tokens={props.role.tokenAddresses}
                    />
                }
                value={props.role.id.toString()}
                register={props.register}
            />
        </Box>
    )
}
