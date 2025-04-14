import React, { PropsWithChildren, useContext, useState } from 'react'
import { useElement } from '@udecode/plate-common/react'
import { Box, Icon } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { atoms } from 'ui/styles/atoms.css'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { pillShimmerClass } from 'ui/styles/globals/shimmer.css'
import { LoadingElementDataContext } from '@components/RichTextPlate/LoadingElementDataContext'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { SECOND_MS } from 'data/constants'
import { TContractAddressElement } from './autocomplete/types'

export const ContractAddressElementWithoutPlate = ({
    children,
    address,
}: PropsWithChildren<{ address: string }>) => {
    const short = shortAddress(address)

    const { loadingAddresses } = useContext(LoadingElementDataContext)
    const isLoading = loadingAddresses.has(address)
    const [, copy] = useCopyToClipboard()
    const [copied, setCopied] = useState(false)
    const onCopy = async () => {
        await copy(address)
        setCopied(true)
        setTimeout(() => setCopied(false), SECOND_MS * 1)
    }
    return (
        <Box
            horizontal
            gap="xs"
            cursor="pointer"
            title={address}
            autoCorrect="off"
            display="inline-flex"
            className={
                pillShimmerClass +
                ' ' +
                atoms({
                    background: 'level3',
                    color: 'gray2',
                    fontSize: 'sm',
                    borderRadius: 'xs',
                    paddingX: 'xs',
                    insetY: 'xxs',
                    border: 'level4',
                })
            }
        >
            {short}
            {isLoading ? (
                <ButtonSpinner height="x1" />
            ) : (
                <Box
                    paddingTop="xxs"
                    cursor="pointer"
                    color={copied ? 'positive' : 'gray2'}
                    onClick={onCopy}
                >
                    {!copied ? (
                        <Icon type="copy" display="inline-block" size="square_xxs" />
                    ) : (
                        <Icon type="check" display="inline-block" size="square_xxs" />
                    )}
                </Box>
            )}
            {children}
        </Box>
    )
}

export const ContractAddressElement = (props: React.PropsWithChildren) => {
    const element = useElement<TContractAddressElement>()
    return (
        <ContractAddressElementWithoutPlate address={element.address}>
            {props.children}
        </ContractAddressElementWithoutPlate>
    )
}
