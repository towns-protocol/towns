import React from 'react'
import { Box, BoxProps, Grid, Icon, Stack } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { Container } from '../components/PlaygroundContainer'

export const PageColors = () => {
    return (
        <>
            <Container grow horizontal label="Background - Basic">
                <Stack padding background="level1" rounded="md">
                    level1
                </Stack>
                <Stack padding background="level2" rounded="md">
                    level2
                </Stack>
                <Stack padding background="level3" rounded="md">
                    level3
                </Stack>
                <Stack padding background="level4" rounded="md">
                    level4
                </Stack>
            </Container>
            <Container grow horizontal elevate label="Background - with `elevate` prop">
                <Stack padding background="level1" rounded="md">
                    level1
                </Stack>
                <Stack padding background="level2" rounded="md">
                    level2
                </Stack>
                <Stack padding background="level3" rounded="md">
                    level3
                </Stack>
                <Stack padding background="level4" rounded="md">
                    level4
                </Stack>
            </Container>
            <Container label="Background (layer)">
                {Object.keys(vars.color.layer)
                    .filter((c) => !c.match(/hover$/i))
                    .map((c) => (
                        <Stack horizontal gap key={c} alignItems="center">
                            <Grid grow columns={2} width="200">
                                <Box border padding background={c as BoxProps['background']}>
                                    Text
                                </Box>
                                <Box justifyContent="center">{c}</Box>
                            </Grid>
                        </Stack>
                    ))}
            </Container>
            <Container label="Background (tones)">
                {Object.keys(vars.color.tone).map((c) => (
                    <Stack horizontal gap key={c} alignItems="center">
                        <Grid grow columns={2} width="200">
                            <Box border padding background={c as keyof typeof vars.color.tone}>
                                Text
                            </Box>
                            <Box justifyContent="center">{c}</Box>
                        </Grid>
                    </Stack>
                ))}
            </Container>
            <Container label="Text Color">
                <Grid grow columns={2} gap="none">
                    {Object.keys(vars.color.foreground).map((c) => (
                        <>
                            <Box borderBottom justifyContent="center" key={`name-${c}`}>
                                {c}
                            </Box>
                            <Box
                                borderBottom
                                padding
                                key={`color-${c}`}
                                background={
                                    c === 'inverted'
                                        ? 'inverted'
                                        : c === 'onTone'
                                        ? 'error'
                                        : undefined
                                }
                                color={c as keyof typeof vars.color.foreground}
                                fontWeight="strong"
                                justifyContent="center"
                            >
                                {c}
                            </Box>
                        </>
                    ))}
                </Grid>
            </Container>
            <Container label="Using background tokens for icons">
                <Grid grow columns={2} gap="none">
                    {(['level1', 'level2', 'level3', 'level4'] as const).map((c) => (
                        <>
                            <Box borderBottom justifyContent="center" key={`name-${c}`}>
                                {c}
                            </Box>
                            <Box
                                borderBottom
                                padding
                                horizontal
                                gap
                                key={`level-${c}`}
                                color={c as keyof typeof vars.color.foreground}
                                fontWeight="strong"
                                alignItems="center"
                            >
                                <Box width="100" height="height_md" background={c} rounded="xs" />
                                <Icon type="nokey" size="square_sm" color={c} />
                            </Box>
                        </>
                    ))}
                </Grid>
            </Container>
        </>
    )
}
