import React from 'react'
import { useProtocolFee } from 'use-towns-client'
import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { Box, Heading, MotionIcon, Text } from '@ui'
import { Accordion, HeaderProps as AccordionHeaderProps } from 'ui/components/Accordion/Accordion'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { formatUnits } from 'hooks/useBalance'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'

export function ChargesSummary(props: {
    gasInEth: string
    currOpValueInEth: string | undefined
    totalInEth: string
    spaceId: string | undefined
}) {
    const { gasInEth, totalInEth, spaceId } = props
    const { data: protocolFee, isLoading: isLoadingProtocolFee } = useProtocolFee({ spaceId })
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.currOpDecodedCallData,
    )

    const isJoinSpace =
        currOpDecodedCallData?.type === 'joinSpace' ||
        currOpDecodedCallData?.type === 'joinSpace_linkWallet'

    return (
        <Box centerContent gap="md" width="100%">
            <Heading level={2}>{totalInEth + ' ETH'}</Heading>
            <Box width="100%" borderTop="level3" borderBottom="level3">
                <Accordion
                    title="Includes fees"
                    background="none"
                    header={(props) => <FeesAccordionHeader {...props} fees={gasInEth} />}
                >
                    <Box color="gray2" gap="lg" paddingBottom="md">
                        <Box horizontal width="100%" justifyContent="spaceBetween">
                            <Text>
                                Gas{' '}
                                <Text as="span" display="inline">
                                    (estimated)
                                </Text>
                            </Text>
                            <Text> {gasInEth + ' ETH'}</Text>
                        </Box>
                        {isJoinSpace && (
                            <Box horizontal width="100%" justifyContent="spaceBetween">
                                <Text>Protocol</Text>
                                {isLoadingProtocolFee ? (
                                    <ButtonSpinner width="x1" />
                                ) : (
                                    <Text> {formatUnits(protocolFee ?? 0n) + ' ETH'}</Text>
                                )}
                            </Box>
                        )}
                    </Box>
                </Accordion>
            </Box>
        </Box>
    )
}

const FeesAccordionHeader = ({
    title,
    isExpanded,
    fees,
}: AccordionHeaderProps & {
    isExpanded: boolean
    fees: string
}) => {
    return (
        <Box horizontal paddingY="md" justifyContent="spaceBetween" alignItems="center" gap="sm">
            <Box grow gap="sm">
                {title && <Text color="gray2">{title}</Text>}
            </Box>
            <Box color="gray2">{fees} ETH</Box>
            <MotionIcon
                animate={{
                    rotate: isExpanded ? '-180deg' : '0deg',
                }}
                size="square_xs"
                initial={{ rotate: '-180deg' }}
                transition={{ duration: 0.2 }}
                type="arrowDown"
            />
        </Box>
    )
}
