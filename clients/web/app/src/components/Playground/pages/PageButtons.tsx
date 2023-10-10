import React, { ComponentProps, useReducer } from 'react'
import { FancyButton, Grid, Paragraph, Stack, Toggle } from '@ui'
import { lightTheme } from 'ui/styles/vars.css'
import { Container } from '../components/PlaygroundContainer'

type L = Partial<ComponentProps<typeof FancyButton>>

const LONG_TEXT = 'Fancy Panty Lingon Berry'
const SHORT_TEXT = 'Fancy Button'

export const PageButtons = () => {
    const [state, dispatch] = useReducer((s: L, a: Partial<L>) => ({ ...s, ...a }), {
        cta: false,
        spinner: false,
        icon: 'alert',
        disabled: false,
        children: SHORT_TEXT,
    })

    const fancy = (
        <FancyButton
            icon={state.icon ? 'bell' : undefined}
            cta={state.cta}
            spinner={state.spinner}
            disabled={state.disabled}
        >
            {state.children}
        </FancyButton>
    )

    return (
        <>
            <Container grow darkOnly label="Button">
                <Grid grow columns={3}>
                    <Stack
                        grow
                        border
                        centerContent
                        minHeight="200"
                        alignItems="center"
                        className={lightTheme}
                        background="level1"
                    >
                        {fancy}
                    </Stack>
                    <Stack grow border centerContent alignItems="center">
                        {fancy}
                    </Stack>

                    <Stack gap grow>
                        <Control title="CTA">
                            <Toggle
                                toggled={!!state.cta}
                                onToggle={() => dispatch({ cta: !state.cta })}
                            />
                        </Control>
                        <Control title="Text">
                            <Toggle
                                toggled={state.children === LONG_TEXT}
                                onToggle={() =>
                                    dispatch({
                                        children:
                                            state.children === LONG_TEXT ? SHORT_TEXT : LONG_TEXT,
                                    })
                                }
                            />
                        </Control>
                        <Control title="Icon">
                            <Toggle
                                toggled={!!state.icon}
                                onToggle={() => dispatch({ icon: state.icon ? undefined : 'bell' })}
                            />
                        </Control>
                        <Control title="Disabled">
                            <Toggle
                                toggled={!!state.disabled}
                                onToggle={() =>
                                    dispatch({ disabled: state.disabled ? undefined : true })
                                }
                            />
                        </Control>
                        <Control title="Spinner">
                            <Toggle
                                toggled={!!state.spinner}
                                onToggle={() =>
                                    dispatch({ spinner: state.spinner ? undefined : true })
                                }
                            />
                        </Control>
                    </Stack>
                </Grid>
            </Container>
        </>
    )
}

const Control = (props: { title: string; children: React.ReactNode }) => {
    return (
        <Stack horizontal border alignItems="center" padding="sm" alignSelf="start" rounded="xs">
            <Stack width="100">
                <Paragraph>{props.title}</Paragraph>
            </Stack>
            <Stack grow>{props.children}</Stack>
        </Stack>
    )
}
