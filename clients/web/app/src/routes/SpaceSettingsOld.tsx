import React, { useCallback } from 'react'
import { useTownsClient } from 'use-towns-client'
import { Box, Button, Divider, Heading, Paragraph, Stack, Toggle } from '@ui'
import { useExperimentsStore } from 'store/experimentsStore'

interface ExperimentView {
    name: string
    description: string
    getValue: () => boolean
    updateValue: (value: boolean) => void
}

export const SpacesSettingsOld = () => {
    const { resetFullyReadMarkers } = useTownsClient()

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
