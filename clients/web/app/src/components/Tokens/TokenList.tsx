import React, { useEffect, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { getZionTokenAddress } from 'use-zion-client'
import { Box, Checkbox, Text, TextField } from '@ui'
import { getCachedTokensForWallet, useTokensForWallet } from 'api/lib/tokens'
import { TokenAvatar } from './TokenAvatar'
import { TokenProps } from './types'

const shortAddress = (address: string) => {
    const start = address.slice(0, 5)
    const end = address.slice(-3)
    return `${start}...${end}`
}

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

    const { data: tokens } = useTokensForWallet(wallet, zionTokenAddress, isChecked)

    useEffect(() => {
        if (!tokens) return
        const _results = searchArrayOfData(tokens, search)
        setResults(_results)
    }, [search, tokens])

    function handleClick(contractAddress: string) {
        const _selectedTokens = selectedTokens.filter((token: string) => token !== contractAddress)
        setValue('tokens', _selectedTokens)
    }

    return (
        <Box paddingTop="md" cursor="default">
            {!selectedTokens.length ? null : (
                <Box display="flex" flexDirection="row" gap="md" paddingY="md">
                    {selectedTokens.map((contractAddress: string) => {
                        const token = getCachedTokensForWallet().find(
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
                {isChecked &&
                    results.map((data) => (
                        <Checkbox
                            name="tokens"
                            key={data.contractAddress}
                            value={data.contractAddress}
                            label={<TokenCheckboxLabel {...data} />}
                            register={register}
                        />
                    ))}
            </Box>
        </Box>
    )
}
