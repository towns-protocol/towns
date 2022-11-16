import React, { useCallback } from 'react'
import { PowerLevel, usePowerLevels, useSpaceId, useZionClient } from 'use-zion-client'
import { Box, Button, Heading, Stack, TextField } from '@ui'

export const SpacesSettings = () => {
    const { resetFullyReadMarkers, setPowerLevel } = useZionClient()
    const spaceId = useSpaceId()
    const powerLevels = usePowerLevels(spaceId)

    const onLevelChanged = useCallback(
        (level: PowerLevel, newValue: number) => {
            if (spaceId) {
                setPowerLevel(spaceId, level, newValue)
            }
        },
        [setPowerLevel, spaceId],
    )
    return (
        <Stack horizontal padding="lg" gap="md">
            <Box shrink gap>
                <Heading>Settings</Heading>

                <Button onClick={resetFullyReadMarkers}>Mark All As Read</Button>

                {powerLevels.levels.map((level: PowerLevel) => (
                    <PowerLevelView
                        key={level.definition.key}
                        level={level}
                        onLevelChanged={onLevelChanged}
                    />
                ))}
            </Box>
        </Stack>
    )
}

const PowerLevelView = (props: {
    level: PowerLevel
    onLevelChanged: (level: PowerLevel, newValue: number) => void
}) => {
    const { level, onLevelChanged } = props
    const onTextFieldChanged = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = parseInt(event.target.value)
            onLevelChanged(level, newValue)
        },
        [level, onLevelChanged],
    )

    return (
        <Box>
            <b>{level.definition.name}:</b> {level.definition.description}
            <TextField
                id={level.definition.key}
                value={level.value}
                onChange={onTextFieldChanged}
            />
            <br />
        </Box>
    )
}
