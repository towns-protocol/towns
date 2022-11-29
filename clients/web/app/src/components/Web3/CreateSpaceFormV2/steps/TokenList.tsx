import React, { useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Box, Checkbox, Text, TextField } from '@ui'
import { MOCK_TOKENS, MockTokenProps } from '../mock'
import { TokenAvatar, TokenProps } from './TokenAvatar'

const shortAddress = (address: string) => {
    const start = address.slice(0, 5)
    const end = address.slice(-3)
    return `${start}...${end}`
}

export const searchArrayOfData = (array: Record<string, string>[], query: string) => {
    const searchTerm = query
    return array.filter((obj) =>
        Object.values(obj).some((v) => v.match(new RegExp(searchTerm, 'i'))),
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

export const TokenList = ({
    isChecked,
    register,
    setValue,
    watch,
}: { isChecked: boolean } & UseFormReturn) => {
    const data = MOCK_TOKENS // TODO: replace with fetch
    const [results, setResults] = React.useState(data)
    const [search, setSearch] = React.useState('')
    const selectedTokens = watch('tokens')
    useEffect(() => {
        const _results = searchArrayOfData(data, search)
        setResults(_results as MockTokenProps[])
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
                        const token = MOCK_TOKENS.find((t) => t.contractAddress === contractAddress)
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
