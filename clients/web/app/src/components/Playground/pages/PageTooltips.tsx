import React, { ComponentProps, useCallback, useState } from 'react'
import { Box, BoxProps, Button, Grid, Paragraph, Stack, Toggle, Tooltip } from '@ui'
import { TooltipBox } from 'ui/components/Box/TooltipBox'
import { TooltipBoundaryBox } from 'ui/components/Tooltip/TooltipBoundary'
import { Container } from '../components/PlaygroundContainer'

const shortText = `a short tooltip`
const longText = `a longer tooltip that requires several lines of text. This should wrap at a max-width of 45ch`

export const PageTooltips = () => {
    const [key, setKey] = useState('')

    const [active, setActive] = useState(false)

    const onToggleActive = useCallback(() => {
        setActive((t) => !t)
    }, [])

    return (
        <>
            <Container darkOnly label="Tooltip - Top" key={key}>
                <Stack
                    horizontal
                    gap
                    position="sticky"
                    top="none"
                    zIndex="ui"
                    background="level1"
                    padding="md"
                    alignItems="center"
                >
                    <Toggle toggled={active} onToggle={onToggleActive} />
                    <Paragraph>Toggle active</Paragraph>
                </Stack>
                {(['vertical', 'horizontal'] as const).map((placement) => (
                    <Grid columns={3} key={placement}>
                        <TooltipContainer justifyContent="center" label="default">
                            <TooltipTrigger
                                tooltip={shortText}
                                tooltipOptions={{ placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer justifyContent="start" label="default">
                            <TooltipTrigger
                                tooltip={shortText}
                                tooltipOptions={{ placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer
                            {...(placement === 'vertical'
                                ? { justifyContent: 'end' }
                                : { alignItems: 'end' })}
                            label="switch side if not enough space"
                        >
                            <TooltipTrigger
                                tooltip={shortText}
                                tooltipOptions={{ placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer label="no space on the left" alignItems="start">
                            <TooltipTrigger
                                tooltip={longText}
                                tooltipOptions={{ align: 'start', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer label="enough space">
                            <TooltipTrigger
                                tooltip={longText}
                                tooltipOptions={{ align: 'center', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer label="no space on the right" alignItems="end">
                            <TooltipTrigger
                                tooltip={longText}
                                tooltipOptions={{ align: 'center', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer label="align start, not enough space">
                            <TooltipTrigger
                                tooltip={shortText}
                                tooltipOptions={{ align: 'start', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer label="align start" alignItems="end">
                            <TooltipTrigger
                                tooltip={longText}
                                tooltipOptions={{ align: 'start', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer label="align center">
                            <TooltipTrigger
                                tooltip={shortText}
                                tooltipOptions={{ align: 'center', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer
                            label="align center, no space on the left"
                            alignItems="start"
                        >
                            <TooltipTrigger
                                tooltip={longText}
                                tooltipOptions={{ align: 'center', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer
                            label="align center, no space on the right"
                            alignItems="end"
                        >
                            <TooltipTrigger
                                tooltip={longText}
                                tooltipOptions={{ align: 'center', placement, active }}
                            />
                        </TooltipContainer>

                        <TooltipContainer label="align end">
                            <TooltipTrigger
                                tooltip={shortText}
                                tooltipOptions={{ align: 'end', placement, active }}
                            />
                        </TooltipContainer>
                    </Grid>
                ))}

                <Button
                    onClick={() => {
                        console.clear()
                        setKey(Math.random().toString())
                    }}
                >
                    Reset
                </Button>
            </Container>
        </>
    )
}

const TooltipContainer = (props: BoxProps & { label: string }) => {
    return (
        <Box gap="sm" position="relative">
            <Paragraph color="gray2">{props.label}</Paragraph>
            <TooltipBoundaryBox
                grow
                padding
                alignItems="center"
                aspectRatio="1/1"
                background="level2"
                {...props}
            />
        </Box>
    )
}

const TooltipTrigger = ({
    tooltip,
    tooltipOptions,
    ...overrides
}: ComponentProps<typeof TooltipBox>) => (
    <Box
        padding
        border
        background="level4"
        borderRadius="xs"
        boxShadow="card"
        tooltip={tooltip ?? <Tooltip>TEST</Tooltip>}
        tooltipOptions={{ active: false, ...(tooltipOptions ?? {}) }}
        {...overrides}
    >
        Hover me
    </Box>
)
