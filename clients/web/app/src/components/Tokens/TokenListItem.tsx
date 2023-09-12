import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Address } from 'wagmi'
import { z } from 'zod'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { Box, Checkbox, Icon, IconButton, Pill, Text, TooltipRenderer } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { Field } from 'ui/components/_internal/Field'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'
import { useCheckTokenType } from '@components/Web3/checkTokenType'
import { TokenAvatar } from './TokenAvatar'
import { TokenPropsForVList, TokenType } from './types'
import * as styles from './TokenListItem.styles.css'

type CheckboxWithTextInputProps = {
    data: TokenPropsForVList
    selectedItems: TokenDataStruct[]
    toggleContract: ({ contractAddress, tokenIds }: TokenDataStruct) => void
    addContract: (contractAddress: string, tokenIds: number[]) => void
    removeContract: (contractAddress: string) => void
    tokenIds: number[]
    addTokenIdForContract: (contractAddress: string, tokenId: number) => void
    removeTokenIdForContract: (contractAddress: string, tokenId: number) => void
    clearTokenIdsForContract: (contractAddress: string) => void
}

const tokenIdSchema = z.object({
    tokenId: z.number({
        required_error: 'Please enter a number',
        invalid_type_error: 'Please enter a number',
    }),
})

// this component renders a token list item with a checkbox and, in the case of erc1155 tokens, a text input, which requires the user to enter a token id
// adding/removing tokenIds also may add/remove contracts to the selectedItems array in the parent component - see useUpdateSelectedItems
// it includes validation for the text input which is self contained and not a part of the larger react-hook-form validation (if any)
export function TokenListItem({
    data,
    selectedItems,
    toggleContract,
    removeContract,
    tokenIds,
    removeTokenIdForContract,
    addTokenIdForContract,
}: CheckboxWithTextInputProps) {
    const { contractAddress, label, imgSrc, type } = data
    const textInputRef = useRef<HTMLInputElement>(null)
    const isERC1155 = type === TokenType.ERC1155
    const itemRef = useRef<HTMLDivElement>(null)
    const isSelected = selectedItems.map((t) => t.contractAddress).includes(data.contractAddress)
    const [textInputValue, setTextInputValue] = useState<string>('')
    const [tokenIdErrorMessage, setTokenIdErrorMessage] = useState<string | undefined>()

    const onTextInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation()
    }, [])
    const onTextInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation()
    }, [])
    const onTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        const result = tokenIdSchema.safeParse({
            tokenId: Number(value?.length ? value : undefined),
        })
        if (!result.success) {
            if (value === '') {
                setTextInputValue('')
            }
            setTokenIdErrorMessage(result.error.flatten().fieldErrors?.tokenId?.[0])
            return
        } else {
            setTokenIdErrorMessage(undefined)
        }
        setTextInputValue(value)
    }, [])

    const addTokenId = useCallback(() => {
        if (textInputValue) {
            const tokenId = Number(textInputValue)
            addTokenIdForContract(contractAddress, tokenId)
            setTokenIdErrorMessage(undefined)
            setTextInputValue('')
        }
    }, [addTokenIdForContract, contractAddress, textInputValue])

    const onTokenListItemClick = useCallback(
        (e?: React.MouseEvent<HTMLElement>) => {
            if (isERC1155) {
                if (isSelected) {
                    // if this token is selected, and the user entered numbers in the text input, add the token
                    if (textInputValue) {
                        addTokenId()
                    } else {
                        // otherwise just remove this item
                        removeContract(contractAddress)
                    }
                } else {
                    // not selected, there's something in the text field, so add the tokenId to select this token
                    if (textInputValue) {
                        addTokenId()
                    } else {
                        // user is trying to select this token, but they have not added any token ids
                        textInputRef.current?.focus()
                        setTokenIdErrorMessage('Please add a token id')
                    }
                }
            } else {
                toggleContract({ contractAddress: data.contractAddress, tokenIds: [] })
            }
        },
        [
            isERC1155,
            isSelected,
            textInputValue,
            addTokenId,
            removeContract,
            contractAddress,
            toggleContract,
            data.contractAddress,
        ],
    )

    const onTextInputKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                addTokenId()
            }
        },
        [addTokenId],
    )

    const onAddTokenClick = useCallback(
        (e: React.MouseEvent<HTMLInputElement>) => {
            e.stopPropagation()
            addTokenId()
        },
        [addTokenId],
    )
    const onRemoveTokenId = useCallback(
        (id: number, e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation()
            removeTokenIdForContract(contractAddress, id)
        },
        [contractAddress, removeTokenIdForContract],
    )

    useEffect(() => {
        const removeErrorMessage = (e: MouseEvent | FocusEvent) => {
            if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
                setTokenIdErrorMessage(undefined)
            }
        }

        window.addEventListener('click', removeErrorMessage)
        window.addEventListener('focusin', removeErrorMessage)
        return () => {
            window.removeEventListener('click', removeErrorMessage)
            window.removeEventListener('focusin', removeErrorMessage)
        }
    }, [])

    return (
        <Box paddingX="sm" ref={itemRef} onClick={onTokenListItemClick}>
            <Box horizontal justifyContent="spaceBetween" alignItems="center" paddingY="sm">
                <Box horizontal alignItems="center">
                    <TokenAvatar
                        noLabel
                        contractAddress={contractAddress}
                        size="avatar_x4"
                        imgSrc={imgSrc}
                        tokenIds={tokenIds}
                    />
                    <Box paddingX="md">
                        <Text>{label}</Text>
                    </Box>
                    <Text color="gray2">{shortAddress(contractAddress)}</Text>
                </Box>

                <Checkbox
                    name="tokens"
                    value={data.contractAddress}
                    checked={isSelected}
                    onChange={() => onTokenListItemClick()}
                    onClick={(e) => e.stopPropagation()}
                />
            </Box>

            {isERC1155 && (
                <Box horizontal alignItems="start">
                    <Box width="x4" />
                    <Box alignItems="start" paddingLeft="md">
                        <Box horizontal centerContent gap>
                            <Box position="relative">
                                <Field width="100" paddingX="none" tone="neutral">
                                    {(overlays, { className, ...inputProps }) => (
                                        <>
                                            <Box
                                                ref={textInputRef}
                                                as="input"
                                                width="100%"
                                                {...inputProps}
                                                rounded="sm"
                                                height="input_sm"
                                                type="text"
                                                placeholder="Token ID"
                                                value={textInputValue}
                                                border="level4"
                                                fontSize="xs"
                                                background="level2"
                                                color="default"
                                                paddingX="sm"
                                                className={styles.input}
                                                onClick={onTextInputClick}
                                                onFocus={onTextInputFocus}
                                                onChange={onTextInputChange}
                                                onKeyDown={onTextInputKeyDown}
                                            />
                                            {overlays}
                                        </>
                                    )}
                                </Field>

                                <Box
                                    centerContent
                                    tooltip={
                                        <Box background="level4" padding="sm" rounded="sm">
                                            <Text size="sm">
                                                This is an ERC1155 token and requires a token ID.
                                            </Text>
                                        </Box>
                                    }
                                    padding="xs"
                                    rounded="full"
                                    position="absolute"
                                    background="level4"
                                    top="-sm"
                                    right="-sm"
                                    width="x2"
                                    aspectRatio="square"
                                >
                                    <Text size="xs">?</Text>
                                </Box>
                            </Box>
                            <IconButton
                                icon="plus"
                                color="default"
                                border="level4"
                                rounded="full"
                                size="square_xxs"
                                type="button"
                                onClick={onAddTokenClick}
                            />
                        </Box>

                        <Box paddingTop="sm">
                            {tokenIdErrorMessage ? (
                                <ErrorMessageText message={tokenIdErrorMessage} />
                            ) : (
                                <Text size="sm">&nbsp;</Text>
                            )}
                        </Box>
                    </Box>

                    <Box horizontal flexWrap="wrap" paddingLeft="lg" gap="xs">
                        {tokenIds.map((id) => (
                            <Pill
                                key={id}
                                gap="sm"
                                color="default"
                                onClick={(e) => onRemoveTokenId(id, e)}
                            >
                                {id}
                                <Icon
                                    rounded="full"
                                    padding="none"
                                    size="square_xxs"
                                    type="close"
                                />
                            </Pill>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    )
}

// When a user enters an address in search bar, if there are no matches in the token list, we show a custom token list item
// this should behave the same as any other token list item, but it does not do any lookup via the nft api, so extra metadata like label and img are not available
export function CustomTokenWrapper({
    selectedItems,
    toggleContract: onItemClick,
    isCustomAddress,
    address,
    tokenIdsMap,
    removeTokenIdForContract,
    addTokenIdForContract,
    clearTokenIdsForContract,
    addContract,
    removeContract,
}: {
    isCustomAddress: boolean
    address: Address
    tokenIdsMap: Record<string, number[]>
} & Omit<CheckboxWithTextInputProps, 'data' | 'tokenIds'>) {
    const type = useCheckTokenType({
        address,
    })
    const tokenIds = useMemo(() => tokenIdsMap[address] ?? [], [tokenIdsMap, address])
    if (!isCustomAddress) {
        return null
    }
    return (
        <Box padding="md" background="level3" rounded="sm">
            <TokenListItem
                data={{
                    contractAddress: address,
                    label: address,
                    imgSrc: '',
                    id: address,
                    type,
                }}
                selectedItems={selectedItems}
                tokenIds={tokenIds}
                removeTokenIdForContract={removeTokenIdForContract}
                addTokenIdForContract={addTokenIdForContract}
                clearTokenIdsForContract={clearTokenIdsForContract}
                toggleContract={onItemClick}
                addContract={addContract}
                removeContract={removeContract}
            />
        </Box>
    )
}
