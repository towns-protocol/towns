import React, { useEffect } from 'react'
import { FieldValues, UseFormRegister, UseFormReturn } from 'react-hook-form'
import { RoleDetails } from 'use-zion-client'
import { Box, Checkbox, Text } from '@ui'
import { TokenCheckboxLabel } from '@components/Tokens/TokenCheckboxLabel'
import { FormStateKeys } from './formConfig'

export interface RoleCheckboxProps extends RoleDetails {
    channelHasRole: boolean
    tokenAddresses: string[]
}

export function getCheckedValuesForRoleIdsField(rolesWithDetails: RoleCheckboxProps[]) {
    return rolesWithDetails.filter((r) => r.channelHasRole).map((r) => r.id.toString())
}

export function RolesSection(props: {
    spaceId: string
    rolesWithDetails: RoleCheckboxProps[]
    register: UseFormRegister<FieldValues>
    resetField: UseFormReturn['resetField']
}) {
    const { rolesWithDetails, resetField, register, spaceId } = props

    useEffect(() => {
        resetField(FormStateKeys.roleIds, {
            defaultValue: getCheckedValuesForRoleIdsField(rolesWithDetails),
        })
    }, [resetField, rolesWithDetails])

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
                        register={register}
                    />
                )
            })}
        </>
    )
}

function RoleDetailsComponent(props: {
    spaceId: string
    role: RoleCheckboxProps
    register: UseFormRegister<FieldValues>
}): JSX.Element {
    return (
        <Box padding="md" background="level2" borderRadius="sm" key={props.role.id}>
            <Checkbox
                width="100%"
                name={FormStateKeys.roleIds}
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
