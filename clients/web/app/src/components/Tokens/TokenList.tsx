import React, { useEffect, useMemo, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { getZionTokenAddress } from 'use-zion-client'
import uniqBy from 'lodash/uniqBy'
import { Box, Button, Checkbox, Text, TextField } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { getCachedTokensForWallet, useTokenContractsForAddress } from 'api/lib/tokenContracts'
import { Spinner } from '@components/Spinner'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { TokenAvatar } from './TokenAvatar'
import { TokenProps } from './types'

export const searchArrayOfData = (array: TokenProps[], query: string): TokenProps[] => {
    const searchTerm = query
    const regEx = new RegExp(searchTerm, 'i')
    return array.filter((obj) =>
        Object.values(obj).some((v) => {
            if (typeof v === 'string') {
                return v.match(regEx)
            }
        }),
    )
}

const TokenCheckboxLabel = ({ imgSrc, label, contractAddress }: TokenProps) => {
    return (
        <Box flexDirection="row" alignItems="center" paddingY="sm">
            <TokenAvatar imgSrc={imgSrc} />
            <Box paddingX="md">
                <Text>{label}</Text>
            </Box>
            <Text color="gray2">{shortAddress(contractAddress)}</Text>
        </Box>
    )
}

const Loader = () => {
    return (
        <Box centerContent paddingTop="md">
            <Spinner />
        </Box>
    )
}

type TokenListProps = {
    isChecked: boolean
    wallet: string
    chainId?: number
} & UseFormReturn

export const TokenList = ({
    isChecked,
    register,
    setValue,
    watch,
    chainId,
    wallet,
}: TokenListProps) => {
    const zionTokenAddress = useMemo(
        () => (chainId ? getZionTokenAddress(chainId) : null),
        [chainId],
    )

    const [results, setResults] = React.useState<TokenProps[]>([])
    const [search, setSearch] = React.useState('')
    const selectedTokens = watch('tokens')
    const [page, setPage] = useState(getCachedTokensForWallet().previousPageKey || '')
    const loadMore = (pageKey: string) => {
        setPage(pageKey)
    }

    const { data, isFetching, isLoading } = useTokenContractsForAddress(
        'vitalik.eth', // hard coding for testing purposes
        zionTokenAddress,
        isChecked,
        page,
    )

    useEffect(() => {
        if (!data?.tokens) return
        const unique = uniqBy(
            [...getCachedTokensForWallet().tokens, ...data.tokens],
            'contractAddress',
        )
        const _results = searchArrayOfData(unique, search)
        setResults(_results)
        // do not depend on cached data
    }, [search, data])

    function handleClick(contractAddress: string) {
        const _selectedTokens = selectedTokens.filter((token: string) => token !== contractAddress)
        setValue('tokens', _selectedTokens)
    }

    return (
        <Box paddingTop="md" cursor="default">
            {!selectedTokens.length ? null : (
                <Box display="flex" flexDirection="row" gap="md" paddingY="md">
                    {selectedTokens.map((contractAddress: string) => {
                        const token = getCachedTokensForWallet().tokens.find(
                            (t) => t.contractAddress === contractAddress,
                        )
                        return (
                            <TokenAvatar
                                key={contractAddress}
                                imgSrc={token?.imgSrc || ''}
                                label={token?.label || ''}
                                contractAddress={contractAddress}
                                onClick={handleClick}
                            />
                        )
                    })}
                </Box>
            )}

            <TextField
                background="level3"
                placeholder="Search or paste contract address"
                onChange={(e) => setSearch(e.target.value)}
            />
            <Box paddingTop="md">
                {isChecked && (
                    <>
                        {results.map((data) => (
                            <Checkbox
                                name="tokens"
                                key={data.contractAddress}
                                value={data.contractAddress}
                                label={<TokenCheckboxLabel {...data} />}
                                register={register}
                            />
                        ))}

                        {isLoading && <Loader />}

                        {data?.nextPageKey && (
                            <Box paddingY="md">
                                <Button
                                    type="button"
                                    animate={false}
                                    onClick={() => loadMore(data?.nextPageKey || '')}
                                >
                                    {isFetching && <ButtonSpinner />}
                                    Load more
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    )
}
