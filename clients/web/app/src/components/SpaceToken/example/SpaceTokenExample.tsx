import React, { useCallback, useEffect, useState } from 'react'
import { Box, Button } from '@ui'
import { InteractiveSpaceToken } from '../InteractiveSpaceToken'

export const SpaceTokenExample = () => {
    const name = 'COUNCIL OF ZION'
    const [address, setAddress] = useState<string | undefined>()
    const onClick = useCallback(() => {
        const hex = Array(40)
            .fill(0)
            .map((_, i) => (i % 16).toString(16) || Math.floor(Math.random() * 16).toString(16))
            .join('')
        setAddress(hex)
    }, [])

    useEffect(() => {
        if (address) {
            const timeout = setTimeout(() => {
                setAddress(undefined)
            }, 4000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [address])
    return (
        <Box>
            <InteractiveSpaceToken name={name} address={address} />
            <Button disabled={!!address} onClick={onClick}>
                Apply address
            </Button>
        </Box>
    )
}
