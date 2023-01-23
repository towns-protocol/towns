import React, { useCallback } from 'react'
import { PowerLevel, usePowerLevels, useSpaceId, useZionClient } from 'use-zion-client'
import { Box, Button, Divider, Heading, Paragraph, Stack, TextField, Toggle } from '@ui'
import { useExperimentsStore } from 'store/experimentsStore'

interface ExperimentView {
    name: string
    description: string
    getValue: () => boolean
    updateValue: (value: boolean) => void
}

export const SpacesSettingsOld = () => {
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

    const experimentsState = useExperimentsStore()
    //const [experimentsState, setExperimentsState] = React.useState<Record<string, boolean>>({})

    const experiments: ExperimentView[] = [
        {
            name: 'Serge Mode',
            description: 'Show condensed thread updates in the timeline',
            getValue: () => experimentsState.enableInlineThreadUpdates,
            updateValue: (value: boolean) =>
                experimentsState.setState({ enableInlineThreadUpdates: value }),
        },
    ]

    const onExperimentChanged = useCallback((experiment: ExperimentView, newValue: boolean) => {
        experiment.updateValue(newValue)
    }, [])

    return (
        <Stack horizontal padding="lg" gap="md">
            <Box shrink gap>
                <Heading>Settings</Heading>

                <Button onClick={resetFullyReadMarkers}>Mark All As Read</Button>

                <Divider />
                {powerLevels.levels.map((level: PowerLevel) => (
                    <PowerLevelView
                        key={level.definition.key}
                        level={level}
                        onLevelChanged={onLevelChanged}
                    />
                ))}
                <Divider />
                <Heading>Experiments</Heading>

                {experiments.map((e) => (
                    <Stack horizontal as="label" key={e.name}>
                        <Stack centerContent padding="md">
                            <Toggle
                                toggled={e.getValue()}
                                onToggle={(checked) => onExperimentChanged(e, checked)}
                            />
                        </Stack>
                        <Stack grow>
                            <Paragraph strong>{e.name}</Paragraph>
                            <Paragraph color="gray2">{e.description}</Paragraph>
                        </Stack>
                    </Stack>
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
