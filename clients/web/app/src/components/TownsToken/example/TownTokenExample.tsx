import React, { useCallback, useState } from 'react'
import { Box, Button, Paragraph, TextField, Toggle } from '@ui'
import { InteractiveTownsToken } from '../InteractiveTownsToken'
import { TownsTokenProps } from '../TownsToken'

export const TownsTokenExample = (props: Pick<TownsTokenProps, 'size'>) => {
    const [hasImage, setHasImage] = useState(true)
    const [hex, setHex] = useState(
        Array(40)
            .fill(0)
            .map((_, i) => (i % 16).toString(16) || Math.floor(Math.random() * 16).toString(16))
            .join(''),
    )
    const [mintMode, setMintMode] = useState(true)
    const [address, setAddress] = useState<string | undefined>()
    const onClick = useCallback(() => {
        setAddress(hex)
        setMintMode(true)
    }, [hex])
    const onReset = useCallback(() => {
        setMintMode(false)
        setAddress('')
    }, [])

    const imageSrc = '/placeholders/pioneer.png'

    return (
        <Box gap>
            <Box centerContent horizontal aspectRatio="1/1">
                <InteractiveTownsToken
                    size={props.size}
                    address={address}
                    mintMode={mintMode}
                    imageSrc={hasImage ? imageSrc : undefined}
                    spaceName="Devtown"
                />
            </Box>
            <Box>
                <TextField
                    prefix="0x"
                    background="level2"
                    value={hex}
                    onChange={(e) => setHex(e.currentTarget.value)}
                />
            </Box>
            <Button disabled={!!address} onClick={onClick}>
                Apply address
            </Button>
            <Button disabled={!address || !mintMode} onClick={onReset}>
                Reset
            </Button>
            <Box horizontal padding="sm" alignItems="center" gap="sm" justifySelf="start">
                <Toggle toggled={hasImage} onToggle={() => setHasImage((v) => !v)} />
                <Paragraph>toggle image</Paragraph>
            </Box>
        </Box>
    )
}
