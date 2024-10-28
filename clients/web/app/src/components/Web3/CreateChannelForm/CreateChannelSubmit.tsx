import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import {
    CreateChannelInfo,
    IRuleEntitlementV2Base,
    Permission,
    RoleDetails,
    TransactionStatus,
    convertRuleDataV1ToV2,
    useCreateChannelTransaction,
    useMultipleRoleDetails,
} from 'use-towns-client'
import { ApiObject } from '@rudderstack/analytics-js/*'
import { Analytics } from 'hooks/useAnalytics'
import { GetSigner } from 'privy/WalletReady'
import { convertRuleDataToTokensAndEthBalance } from '@components/Tokens/utils'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { FancyButton } from '@ui'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { CreateChannelFormSchema } from './createChannelFormSchema'

export function CreateChannelSubmit(props: {
    spaceId: string
    channelFormPermissionOverrides:
        | Record<
              number,
              {
                  permissions: Permission[] | undefined
              }
          >
        | undefined
    rolesWithDetails: RoleDetails[]
    createChannelTransaction: ReturnType<
        typeof useCreateChannelTransaction
    >['createChannelTransaction']
    invalidateQuery: ReturnType<typeof useMultipleRoleDetails>['invalidateQuery']
    onCreateChannel: (roomId: string) => void
    getSigner: GetSigner
    disabled: boolean
    text: string
}) {
    const { handleSubmit, formState } = useFormContext<CreateChannelFormSchema>()
    const {
        disabled,
        text,
        spaceId,
        channelFormPermissionOverrides,
        rolesWithDetails,
        createChannelTransaction,
        invalidateQuery,
        getSigner,
        onCreateChannel,
    } = props

    const onSubmit = useCallback(
        async (data: CreateChannelFormSchema, getSigner: GetSigner) => {
            const { name, topic, roleIds, autojoin, hideUserJoinLeaveEvents } = data
            const signer = await getSigner()
            const _roleIds = roleIds.map((roleId) => Number(roleId))
            const channelInfo = {
                name: name,
                topic: topic,
                parentSpaceId: spaceId,
                roles: _roleIds.map((r) => ({
                    roleId: r,
                    permissions: channelFormPermissionOverrides?.[r]?.permissions ?? [],
                })),
                channelSettings: {
                    hideUserJoinLeaveEvents,
                    autojoin,
                },
            } satisfies CreateChannelInfo

            const _rolesWithDetails =
                (_roleIds
                    .map((roleId): ApiObject | undefined => {
                        const r = rolesWithDetails?.find((role) => role.id === roleId)
                        if (r) {
                            const { ruleData } = r

                            const ruleDataV2: IRuleEntitlementV2Base.RuleDataV2Struct | undefined =
                                ruleData.kind === 'v1'
                                    ? convertRuleDataV1ToV2(ruleData.rules)
                                    : ruleData.rules

                            const { tokens: convertedTokens } =
                                convertRuleDataToTokensAndEthBalance(ruleDataV2)

                            const tokens = convertedTokens.map((t) => {
                                return {
                                    chainId: t.chainId,
                                    contractAddress: t.address,
                                    opType: t.type,
                                    threshold: t.quantity.toString(),
                                } as ApiObject
                            })

                            return {
                                id: r.id,
                                name: r.name,
                                permissions: r.permissions,
                                users: r.users,
                                tokens,
                            }
                        }
                        return undefined
                    })
                    .filter((r) => r !== undefined) as ApiObject[]) ?? []
            const tracked = {
                channelName: name,
                parentSpaceId: spaceId,
                rolesWithDetails: _rolesWithDetails,
            }
            Analytics.getInstance().track('submitting create channel form', tracked, () => {
                console.log('[analytics] submitting create channel form', tracked)
            })

            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }

            const txResult = await createChannelTransaction(channelInfo, signer)

            console.log('[CreateChannelForm]', 'createChannelTransaction result', txResult)
            if (txResult?.status === TransactionStatus.Success) {
                invalidateQuery()
                const channelId = txResult.data
                const trackCreated = {
                    ...tracked,
                    channelId,
                }
                if (channelId) {
                    Analytics.getInstance().track('created channel', trackCreated, () => {
                        console.log('[analytics] created channel', trackCreated)
                    })

                    popupToast(({ toast }) => (
                        <StandardToast.Success
                            toast={toast}
                            message={`#${name} was created and saved on chain.`}
                        />
                    ))
                    onCreateChannel(channelId)
                }
            }
        },
        [
            channelFormPermissionOverrides,
            createChannelTransaction,
            invalidateQuery,
            onCreateChannel,
            rolesWithDetails,
            spaceId,
        ],
    )

    return (
        <FancyButton
            cta={!disabled && formState.isValid}
            data-testid="create-channel-submit-button"
            disabled={disabled}
            spinner={disabled}
            onClick={handleSubmit((data) => onSubmit(data, getSigner))}
        >
            {text}
        </FancyButton>
    )
}
