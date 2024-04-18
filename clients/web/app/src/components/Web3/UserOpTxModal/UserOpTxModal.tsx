import React from 'react'
import { userOpsStore } from '@towns/userops'
import { BigNumber, utils } from 'ethers'

import { useMembershipInfo } from 'use-towns-client'
import { Box, Button, Heading, Icon, IconButton, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { isTouch } from 'hooks/useDevice'
import { useIsSmartAccountDeployed } from 'hooks/useIsSmartAccountDeployed'
import { useBalance } from 'hooks/useBalance'
import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { formatEthDisplay } from '../utils'
import { CopyWalletAddressButton } from '../TokenVerification/Buttons'

type Props = {
    membershipPrice?: bigint
    isLoadingMembershipPrice?: boolean
    membershipPriceError?: ReturnType<typeof useMembershipInfo>['error']
}

export function UserOpTxModal(props: Props) {
    const { currOpGas, deny } = userOpsStore()
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()

    if (!currOpGas) {
        return null
    }
    return (
        <ModalContainer
            minWidth="auto"
            onHide={() => {
                endPublicPageLoginFlow()
                deny?.()
            }}
        >
            <UserOpTxModalContent {...props} endPublicPageLoginFlow={endPublicPageLoginFlow} />
        </ModalContainer>
    )
}

function UserOpTxModalContent({
    membershipPrice,
    isLoadingMembershipPrice,
    membershipPriceError,
    endPublicPageLoginFlow,
}: Props & { endPublicPageLoginFlow: () => void }) {
    const { currOpGas, confirm, deny, smartAccountAddress } = userOpsStore()

    const {
        data: isSmartAccountDeployed,
        isLoading: isSmartAccountDeployedLoading,
        error: isSmartAccountDeployedError,
    } = useIsSmartAccountDeployed()

    const gasPrice = currOpGas?.maxFeePerGas ?? 0.0
    const gasLimit = currOpGas?.callGasLimit ?? 0.0
    const preverificationGas = currOpGas?.preverificationGas ?? 0.0

    const gasCost = BigNumber.from(gasLimit)
        .mul(BigNumber.from(gasPrice))
        .add(BigNumber.from(preverificationGas))

    const totalCost = gasCost.add(BigNumber.from(membershipPrice ?? 0))

    const gasInEth = utils.formatEther(gasCost)
    const membershipInEth = membershipPrice ? utils.formatEther(membershipPrice) : undefined
    const totalInEth = utils.formatEther(totalCost.toBigInt())
    const totalInEthFixed = parseFloat(totalInEth).toFixed(5)
    const displayTotalEthPrice = totalInEthFixed === '0.00000' ? '< 0.00001' : totalInEthFixed

    const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
        address: smartAccountAddress,
        enabled: !!smartAccountAddress,
        watch: true,
    })
    const formattedBalance =
        formatEthDisplay(Number.parseFloat(balanceData?.formatted ?? '0')) +
        ' ' +
        (balanceData?.symbol ? balanceData.symbol : '')

    const balanceIsLessThanCost = balanceData && balanceData.value < totalCost.toBigInt()
    const _isTouch = isTouch()

    const bottomContent = () => {
        if (membershipPriceError) {
            return (
                <Text color="error" size="sm">
                    There was an error grabbing the membership price. Please try again later.
                </Text>
            )
        }

        if (!balanceData) {
            return <Box centerContent height="x4" width="100%" />
        }

        if (isSmartAccountDeployedLoading) {
            return <ButtonSpinner />
        }

        // Temporary, to be refactored w/ credit card integration
        // https://linear.app/hnt-labs/issue/HNT-5529/revisit-the-smart-account-not-deployed-guard-in-useroptxmodal
        if (isSmartAccountDeployedError || !isSmartAccountDeployed) {
            return (
                <>
                    <Text color="error" size="sm">
                        Smart wallet is not yet deployed.
                    </Text>
                </>
            )
        }

        if (balanceIsLessThanCost) {
            return (
                <>
                    <Text color="error" size="sm">
                        Wallet has insufficient funds for this transaction
                    </Text>
                    <CopyWalletAddressButton
                        text="Copy Wallet Address"
                        address={smartAccountAddress}
                    />
                </>
            )
        }
        return (
            <Button tone="cta1" width="100%" onClick={confirm}>
                Confirm
            </Button>
        )
    }

    return (
        <>
            <IconButton
                padding="xs"
                alignSelf="end"
                icon="close"
                onClick={() => {
                    endPublicPageLoginFlow()
                    deny()
                }}
            />
            <Box gap centerContent width={!_isTouch ? '400' : undefined} maxWidth="400">
                <Box paddingBottom="sm">
                    <Text strong size="lg">
                        Confirm Transaction
                    </Text>
                </Box>
                <Heading level={2}>{displayTotalEthPrice + ' ETH'}</Heading>
                <Box padding background="level3" rounded="sm" width="100%" gap="md" color="default">
                    <Box
                        horizontal={!_isTouch}
                        gap={_isTouch ? 'sm' : undefined}
                        width="100%"
                        justifyContent="spaceBetween"
                    >
                        <Text>
                            Gas{' '}
                            <Text color="gray2" as="span" display="inline">
                                (estimated)
                            </Text>
                        </Text>
                        <Text> {gasInEth + ' ETH'}</Text>
                    </Box>
                    {isLoadingMembershipPrice ? <ButtonSpinner /> : null}
                    {membershipPrice ? (
                        <Box
                            horizontal={!_isTouch}
                            gap={_isTouch ? 'sm' : undefined}
                            width="100%"
                            justifyContent="spaceBetween"
                        >
                            <Text>Membership </Text>
                            <Text> {membershipInEth + ' ETH'}</Text>
                        </Box>
                    ) : null}

                    <Box
                        horizontal={!_isTouch}
                        gap={_isTouch ? 'sm' : undefined}
                        paddingTop="md"
                        borderTop="level4"
                        width="100%"
                        justifyContent="spaceBetween"
                    >
                        <Text strong>Total</Text>
                        <Text strong> {totalInEth + ' ETH'}</Text>
                    </Box>
                </Box>
                <Box color="default" background="level3" rounded="sm" width="100%" gap="md">
                    <Box
                        padding
                        horizontal={!_isTouch}
                        gap={_isTouch ? 'sm' : undefined}
                        justifyContent="spaceBetween"
                        alignItems="center"
                    >
                        <Box horizontal gap="sm">
                            <Box position="relative" width="x3">
                                <Icon position="absoluteCenter" type="wallet" />{' '}
                            </Box>
                            <Text>
                                {isLoadingBalance
                                    ? 'Fetching balance...'
                                    : smartAccountAddress
                                    ? shortAddress(smartAccountAddress)
                                    : 'asdff'}
                            </Text>
                        </Box>
                        {formattedBalance ? (
                            <Text color={balanceIsLessThanCost ? 'error' : 'default'}>
                                {formattedBalance} Available
                            </Text>
                        ) : (
                            <ButtonSpinner />
                        )}
                    </Box>
                </Box>
                {bottomContent()}
            </Box>
        </>
    )
}
