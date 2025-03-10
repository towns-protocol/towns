import React, { useMemo } from 'react'
import {
    BlockchainTransactionType,
    useIsTransactionPending,
    useMembershipInfo,
    usePricingModuleForMembership,
    usePricingModules,
    useRoleDetails,
} from 'use-towns-client'
import { constants } from 'ethers'
import { FormProvider, UseFormReturn } from 'react-hook-form'
import { FormRender, Icon, Paragraph, Stack, Text } from '@ui'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { EditPricing } from '@components/Web3/EditMembership/EditPricing'
import { EditMembership } from '@components/Web3/EditMembership/EditMembership'

import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { formatUnits } from 'hooks/useBalance'
import { EditPricingTitle } from '@components/Web3/EditMembership/EditPricingTitle'
import { useEntitlements } from 'hooks/useEntitlements'
import { usePlatformMinMembershipPriceInEth } from 'hooks/usePlatformMinMembershipPriceInEth'
import { EditMembershipSchemaType, editMembershipSchema } from './editMembershipSchema'
import { useIsSpaceCurrentlyDynamic, useIsSpaceCurrentlyFree } from './hooks'
import { EditMembershipSubmitButton } from './EditMembershipSubmitButton'
import { minterRoleId } from './rolePermissions.const'

export const EditMembershipSettingsPanel = React.memo(() => {
    const spaceIdFromPath = useSpaceIdFromPathname()
    const transactionIsPending = useIsTransactionPending(
        BlockchainTransactionType.EditSpaceMembership,
    )
    const onChainData = useLookupOnChainDataForThisForm({
        spaceId: spaceIdFromPath,
    })
    return (
        <>
            <Stack gap grow position="relative">
                {onChainData.isLoadingSomeData ? (
                    <Stack grow centerContent>
                        <ButtonSpinner />
                    </Stack>
                ) : onChainData.someErrorOccurred ? (
                    <Paragraph>Failed to load membership info</Paragraph>
                ) : (
                    <EditMembershipForm spaceId={spaceIdFromPath} onChainData={onChainData} />
                )}
            </Stack>
            {transactionIsPending && <FullPanelOverlay text="" withSpinner={false} />}
        </>
    )
})

function EditMembershipForm({
    spaceId,
    onChainData,
}: {
    spaceId: string | undefined
    onChainData: ReturnType<typeof useLookupOnChainDataForThisForm>
}) {
    const environment = useEnvironment()
    const transactionIsPending = useIsTransactionPending(
        BlockchainTransactionType.EditSpaceMembership,
    )

    const {
        entitlements,
        isEntitlementsLoading,
        pricingModules,
        isLoadingPricingModules,
        minimumMembershipPrice,
        isLoadingMinMembershipPrice,
        roleDetails,
        currentPricingModule,
        isCurrentlyFree,
        isCurrentlyDynamic,
        isLoadingRoleDetails,
        membershipInfo,
    } = onChainData

    const defaultValues: EditMembershipSchemaType = useMemo(
        () => ({
            gatingType: entitlements.hasEntitlements ? 'gated' : 'everyone',
            tokensGatedBy: entitlements.tokens,
            ethBalanceGatedBy: entitlements.ethBalance,
            usersGatedBy: entitlements.users,
            membershipLimit: Number(membershipInfo?.maxSupply) ?? 0,
            membershipCost: formatUnits(membershipInfo?.price.toBigInt() ?? 0n),
            membershipPricingType: currentPricingModule?.isFixed ? 'fixed' : 'dynamic',
            clientPricingOption: currentPricingModule?.isFixed ? 'fixed' : 'dynamic',
            membershipCurrency: (membershipInfo?.currency as string) ?? constants.AddressZero,
            prepaidMemberships: 0,
        }),
        [entitlements, membershipInfo, currentPricingModule],
    )

    const isFree = useIsSpaceCurrentlyFree({
        spaceId,
    })

    if (isEntitlementsLoading) {
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
                                            {!currentPricingModule?.isFixed &&
                                                isFixedPricingSelected && (
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
                                                isFixed={currentPricingModule?.isFixed}
                                                isFree={isFree}
                                                pricingModules={pricingModules}
                                                isLoadingPricingModules={isLoadingPricingModules}
                                                minimumMembershipPrice={minimumMembershipPrice}
                                                isLoadingMinMembershipPrice={
                                                    isLoadingMinMembershipPrice
                                                }
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
                                    pricingModules={pricingModules}
                                    minimumMembershipPrice={minimumMembershipPrice}
                                    isLoadingPricingModules={isLoadingPricingModules}
                                    roleDetails={roleDetails}
                                    currentPricingModule={currentPricingModule}
                                    isCurrentlyFree={!!isCurrentlyFree}
                                    isCurrentlyDynamic={!!isCurrentlyDynamic}
                                    isLoadingRoleDetails={isLoadingRoleDetails}
                                >
                                    Update
                                </EditMembershipSubmitButton>
                            </Stack>
                        </FormProvider>
                    )
                }}
            </FormRender>
        </>
    )
}

function useLookupOnChainDataForThisForm(args: { spaceId: string | undefined }) {
    const { spaceId } = args
    const {
        data: pricingModules,
        isLoading: isLoadingPricingModules,
        error: pricingModuleError,
    } = usePricingModules()
    const {
        roleDetails,
        isLoading: isLoadingRoleDetails,
        error: roleDetailsError,
    } = useRoleDetails(spaceId ?? '', 1)
    const { data: currentPricingModule, isLoading: isLoadingMembershipPricingModule } =
        usePricingModuleForMembership(spaceId)
    const {
        data: minimumMembershipPrice,
        isLoading: isLoadingMinMembershipPrice,
        error: minimumMembershipPriceError,
    } = usePlatformMinMembershipPriceInEth()
    const isCurrentlyFree = useIsSpaceCurrentlyFree({
        spaceId,
    })
    const isCurrentlyDynamic = useIsSpaceCurrentlyDynamic({
        spaceId,
    })

    const { data: entitlements, isLoading: isEntitlementsLoading } = useEntitlements(
        spaceId,
        minterRoleId,
    )

    const {
        data: membershipInfo,
        isLoading: isLoadingMembershipInfo,
        error: membershipInfoError,
    } = useMembershipInfo(spaceId ?? '')

    const isLoadingSomeData =
        isLoadingPricingModules ||
        isLoadingRoleDetails ||
        isLoadingMinMembershipPrice ||
        isLoadingMembershipInfo ||
        isLoadingMembershipPricingModule ||
        isEntitlementsLoading

    const someErrorOccurred =
        membershipInfoError || roleDetailsError || pricingModuleError || minimumMembershipPriceError

    return useMemo(
        () => ({
            pricingModules,
            minimumMembershipPrice,
            isCurrentlyFree,
            isCurrentlyDynamic,
            currentPricingModule,
            isLoadingPricingModules,
            isLoadingRoleDetails,
            roleDetails,
            entitlements,
            isEntitlementsLoading,
            isLoadingMinMembershipPrice,
            membershipInfo,
            isLoadingMembershipInfo,
            membershipInfoError,
            isLoadingSomeData,
            someErrorOccurred,
        }),
        [
            pricingModules,
            minimumMembershipPrice,
            isCurrentlyFree,
            isCurrentlyDynamic,
            currentPricingModule,
            isLoadingPricingModules,
            isLoadingRoleDetails,
            roleDetails,
            entitlements,
            isEntitlementsLoading,
            isLoadingMinMembershipPrice,
            membershipInfo,
            isLoadingMembershipInfo,
            membershipInfoError,
            isLoadingSomeData,
            someErrorOccurred,
        ],
    )
}
