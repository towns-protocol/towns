import React, { useMemo } from 'react'
import {
    BlockchainTransactionType,
    useIsTransactionPending,
    useMembershipFreeAllocation,
    usePricingModules,
} from 'use-towns-client'
import { constants } from 'ethers'
import { FormProvider, UseFormReturn } from 'react-hook-form'
import { FormRender, Icon, Paragraph, Stack, Text } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { EditPricing } from '@components/Web3/EditMembership/EditPricing'
import { EditMembership } from '@components/Web3/EditMembership/EditMembership'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { formatUnits } from 'hooks/useBalance'
import { EditPricingTitle } from '@components/Web3/EditMembership/EditPricingTitle'
import { EditMembershipSchemaType, editMembershipSchema } from './editMembershipSchema'
import { useGatingInfo, useMembershipInfoAndRoleDetails } from './hooks'
import { EditMembershipSubmitButton } from './EditMembershipSubmitButton'

export const EDIT_MEMBERSHIP_SETTINGS_PANEL = 'editMembershipSettings'

export const EditMembershipSettingsPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <EditMembershipSettingsPanelWithoutAuth />
        </PrivyWrapper>
    )
})

function EditMembershipSettingsPanelWithoutAuth() {
    const spaceIdFromPath = useSpaceIdFromPathname()
    const { data, isLoading } = useMembershipInfoAndRoleDetails(spaceIdFromPath)
    const transactionIsPending = useIsTransactionPending(
        BlockchainTransactionType.EditSpaceMembership,
    )
    return (
        <>
            <Stack gap grow position="relative">
                {isLoading ? (
                    <Stack grow centerContent>
                        <ButtonSpinner />
                    </Stack>
                ) : data ? (
                    <EditMembershipForm defaultFormData={data} spaceId={spaceIdFromPath} />
                ) : (
                    <Paragraph>Failed to load membership info</Paragraph>
                )}
            </Stack>
            {transactionIsPending && <FullPanelOverlay text="" withSpinner={false} />}
        </>
    )
}

function EditMembershipForm({
    defaultFormData,
    spaceId,
}: {
    defaultFormData: NonNullable<ReturnType<typeof useMembershipInfoAndRoleDetails>['data']>
    spaceId: string | undefined
}) {
    const environment = useEnvironment()
    const { membershipInfo, pricingModule, roleDetails } = defaultFormData
    const transactionIsPending = useIsTransactionPending(
        BlockchainTransactionType.EditSpaceMembership,
    )
    const { data: freeAllocation } = useMembershipFreeAllocation(spaceId)

    const { gatingType, usersGatedBy, tokensGatedBy, isTokensGatedByLoading } =
        useGatingInfo(roleDetails)

    const { data: pricingModules, isLoading: isLoadingPricingModules } = usePricingModules()

    const defaultValues: EditMembershipSchemaType = useMemo(
        () => ({
            gatingType,
            tokensGatedBy,
            usersGatedBy,
            membershipLimit: Number(membershipInfo?.maxSupply) ?? 0,
            membershipCost: formatUnits((membershipInfo?.price as bigint) ?? 0n),
            membershipPricingType: pricingModule?.isFixed ? 'fixed' : 'dynamic',
            clientPricingOption: pricingModule?.isFixed ? 'fixed' : 'dynamic',
            membershipCurrency: (membershipInfo?.currency as string) ?? constants.AddressZero,
            prepaidMemberships: 0,
        }),
        [gatingType, tokensGatedBy, usersGatedBy, membershipInfo, pricingModule],
    )

    if (isTokensGatedByLoading) {
        return <ButtonSpinner />
    }

    return (
        <>
            <FormRender schema={editMembershipSchema} defaultValues={defaultValues} mode="all">
                {(hookForm) => {
                    const _form = hookForm as unknown as UseFormReturn<EditMembershipSchemaType>
                    const watchPricingField = _form.watch(['membershipPricingType'])
                    const isFixedPricingSelected = watchPricingField[0] === 'fixed'

                    return (
                        <FormProvider {..._form}>
                            <Stack grow gap paddingY="xs">
                                <Stack gap="paragraph">
                                    <Paragraph strong>Who Can Join</Paragraph>
                                    <EditGating />
                                </Stack>
                                {environment.accountAbstractionConfig && (
                                    <>
                                        <Stack gap="paragraph">
                                            <EditPricingTitle />
                                            {!pricingModule?.isFixed && isFixedPricingSelected && (
                                                <Stack
                                                    horizontal
                                                    background="level2"
                                                    padding="md"
                                                    gap="sm"
                                                    rounded="sm"
                                                    alignItems="center"
                                                >
                                                    <Icon
                                                        type="info"
                                                        color="negative"
                                                        size="square_sm"
                                                    />
                                                    <Text size="sm">
                                                        {`This space is using dynamic pricing. If you
                        switch to fixed pricing, you can't go back.`}
                                                    </Text>
                                                </Stack>
                                            )}
                                            <EditPricing
                                                isEditMode
                                                freeAllocation={freeAllocation}
                                                pricingModules={pricingModules}
                                                isLoadingPricingModules={isLoadingPricingModules}
                                            />
                                        </Stack>
                                        <Stack gap="paragraph">
                                            <Paragraph strong>Membership</Paragraph>
                                            <EditMembership />
                                        </Stack>
                                    </>
                                )}

                                <EditMembershipSubmitButton
                                    spaceId={spaceId}
                                    transactionIsPending={transactionIsPending}
                                >
                                    Update
                                </EditMembershipSubmitButton>
                            </Stack>
                        </FormProvider>
                    )
                }}
            </FormRender>
            <UserOpTxModal />
        </>
    )
}
