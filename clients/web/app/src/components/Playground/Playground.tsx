import React, { useEffect, useState } from 'react'
import axios, { AxiosResponse } from 'axios'
import {
    Avatar,
    Box,
    BoxProps,
    Button,
    Divider,
    Dropdown,
    Grid,
    Heading,
    Icon,
    IconName,
    Paragraph,
    RadioSelect,
    Stack,
    Tooltip,
    TooltipRenderer,
    iconTypes,
} from '@ui'
import { TextProps } from 'ui/components/Text/Text'
import { atoms } from 'ui/styles/atoms.css'
import { darkClass, lightClass } from 'ui/styles/globals/storybook.css'
import { vars } from 'ui/styles/vars.css'
import { richText } from '@components/RichText/RichTextEditor.css'
import { isDev } from 'utils'
import { RadioCard } from 'ui/components/Radios/RadioCard'
import { VListExample } from '../../ui/components/VList/example/VListExample'
import { DummyReactHooksFormWrapper } from './DummyReactHooksFormWrapper'

const A3 = Array(3)
    .fill(undefined)
    .map((_, i) => i)

export const Playground = () => {
    const [mockData, setMockData] = useState<AxiosResponse | null>(null)
    useEffect(() => {
        if (isDev) {
            axios.get('/mock-endpoint').then(setMockData)
        }
    }, [])
    return (
        <Stack position="relative">
            <Container label="Mock Data">
                <p>{mockData?.data.name}</p>
            </Container>
            <Container label="Paragraph">
                <Grid columns={2}>
                    <Stack>
                        <Paragraph size="lg">Paragraph large</Paragraph>
                        <Paragraph>Paragraph medium</Paragraph>
                        <Paragraph size="sm">Paragraph small</Paragraph>
                    </Stack>
                    <Stack>
                        <Paragraph size="lg" fontWeight="strong">
                            Paragraph large
                        </Paragraph>
                        <Paragraph fontWeight="strong">Paragraph medium</Paragraph>
                        <Paragraph size="sm" fontWeight="strong">
                            Paragraph small
                        </Paragraph>
                    </Stack>
                </Grid>
            </Container>
            <Container label="Headings">
                <Heading level={1}>Heading 1</Heading>
                <Heading level={2}>Heading 2</Heading>
                <Heading level={3}>Heading 3</Heading>
            </Container>
            <Container label="Text Content">
                <Box debug className={richText}>
                    <h2>Heading</h2>
                    <Paragraph>Paragraph</Paragraph>
                    <p>
                        Litecoin threw away lots of robust instamine behind a algorithm, nor Basic
                        Attention Token thinking many burned behind the stale block!
                        <br />
                        reinvested ledger for few peer-to-peer network! Tezos rejoins a node because
                        Binance Coin sharded a cryptocurrency.
                    </p>
                    <p>
                        ICO thought lots of minimum dapp, but Ethereum threw away lots of
                        deterministic wallet. EOS thought the chain behind the transaction fee, or
                        SHA 256 returns a zero confirmation transaction! Although Bitcoin Cash did a
                        minimum dapp, Waves cost many instant gas.
                    </p>
                    <ul>
                        <li>Message 1</li>
                        <li>Message 2</li>
                        <li>Message 3</li>
                    </ul>
                    <ul>
                        <li>
                            For few peer-to-peer network! Tezos rejoins a node because Binance Coin
                            sharded a cryptocurrency.
                        </li>
                        <li>Message 2</li>
                        <li>
                            For few peer-to-peer network! Tezos rejoins a node because Binance Coin
                            sharded a cryptocurrency.
                        </li>
                    </ul>
                    <ol>
                        <li>first</li>
                        <li>
                            <ol>
                                <li>second 1</li>
                                <li>second 2</li>
                                <li>second 3</li>
                            </ol>
                        </li>
                        <li>third</li>
                    </ol>
                </Box>
            </Container>
            <Container label="Background (layer)">
                {Object.keys(vars.color.layer).map((c) => (
                    <Stack horizontal gap key={c} alignItems="center">
                        <Grid grow columns={2} width="200">
                            <Box
                                border
                                padding
                                background={c as keyof typeof vars.color.background}
                            >
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
                        <Stack key={c}>
                            <Box
                                borderBottom
                                padding
                                color={c as keyof typeof vars.color.foreground}
                                fontWeight="strong"
                                justifyContent="center"
                            >
                                {c}
                            </Box>
                            <Box borderBottom justifyContent="center">
                                {c}
                            </Box>
                        </Stack>
                    ))}
                </Grid>
            </Container>

            <Container label="Buttons">
                <Divider label="tones" />
                <Box gap alignSelf="start" minWidth="250" alignItems="start">
                    <Button>Default</Button>
                    <Button tone="cta1">CTA</Button>
                </Box>
                <Divider label="sizes" />
                <Box gap alignSelf="start" minWidth="250" alignItems="start">
                    <Button size="button_lg">large</Button>
                    <Button size="button_md">medium</Button>
                    <Button size="button_sm">small</Button>
                </Box>
                <Divider label="icon buttons" />
                <Box gap alignSelf="start" minWidth="250" alignItems="start">
                    <Button tone="cta1" size="button_lg" icon="check">
                        Action
                    </Button>
                    <Button tone="cta1" size="button_md" icon="check">
                        Action
                    </Button>
                    <Button tone="cta1" size="button_sm" icon="check">
                        Action
                    </Button>
                </Box>
            </Container>

            <Container label="Icons">
                <Grid gap alignSelf="start" minWidth="250" alignItems="start" columns={5}>
                    {iconTypes.map((t: IconName) => (
                        <Stack horizontal key={t}>
                            <Box width="x6">
                                <Icon type={t} />
                            </Box>
                            <Box color="gray2">{t}</Box>
                        </Stack>
                    ))}
                </Grid>
            </Container>

            <Container label="Avatars">
                {}
                <Avatar size="avatar_lg" />
                <Avatar size="avatar_md" />
                <Avatar size="avatar_sm" />
                <Avatar size="avatar_xs" />
            </Container>

            <Container label="Dropdown" background="level1">
                <Dropdown
                    label="Dropdown Label"
                    icon="lock"
                    options={[
                        { value: 'birds', label: 'Birds' },
                        { value: 'bears', label: 'Bears' },
                        { value: 'horses', label: 'Horses' },
                    ]}
                />
                <RadioSelect
                    label="Checkbox Label"
                    options={[
                        { value: 'birds', label: 'Birds' },
                        { value: 'bears', label: 'Bears' },
                        { value: 'horses', label: 'Horses' },
                    ]}
                />
            </Container>

            <Container label="Tooltips">
                <Box>
                    <TooltipRenderer trigger="hover" render={<Tooltip>Hello</Tooltip>}>
                        {({ triggerProps }) => (
                            <Box {...triggerProps} alignSelf="start">
                                Hover Me
                            </Box>
                        )}
                    </TooltipRenderer>
                </Box>
            </Container>

            <Container label="Box Primitive">
                <Divider label="padding" />
                <Grid columns={2} gap="none">
                    {Object.keys(vars.space).map((b) => (
                        <>
                            <Box horizontal paddingY="sm">
                                <Box
                                    horizontal
                                    background="level3"
                                    display="block"
                                    key={b}
                                    padding={b as keyof typeof vars.space}
                                >
                                    <Box background="etherum" square="square_xs" />
                                </Box>
                            </Box>
                            <Box justifyContent="center">
                                <Box>{b}</Box>
                            </Box>
                        </>
                    ))}
                </Grid>

                <Divider label="Gap" />

                <Grid columns={2}>
                    {Object.keys(vars.space).map((b) => (
                        <>
                            <Box horizontal>
                                <Box
                                    border
                                    horizontal
                                    padding="sm"
                                    background="level3"
                                    key={b}
                                    gap={b as keyof typeof vars.space}
                                >
                                    {A3.map((_, i) => (
                                        <Box key={_} background="etherum" square="square_xs" />
                                    ))}
                                </Box>
                            </Box>
                            <Box>
                                <Box>{b}</Box>
                            </Box>
                        </>
                    ))}
                </Grid>
                <Divider label="direction" />
                <Grid columns={4}>
                    <Stack gap padding="sm" background="level3">
                        {A3.map((b) => (
                            <Box key={b} background="etherum" square="square_xs" />
                        ))}
                    </Stack>
                    <Stack gap horizontal padding="sm" background="level3">
                        {A3.map((b) => (
                            <Box key={b} background="etherum" square="square_xs" />
                        ))}
                    </Stack>
                </Grid>
            </Container>
            <Container darkOnly label="VList" padding="none">
                <Stack>
                    <VListExample />
                </Stack>
            </Container>
            <Container darkOnly label="Sample RadioCard">
                <DummyReactHooksFormWrapper>
                    {({ register, setValue, getValues, control }) => (
                        <>
                            {[
                                {
                                    value: 'everyone',
                                    title: 'Everyone',
                                    description: 'Anyone can join',
                                },
                                {
                                    value: 'multiple',
                                    title: 'Token holders',
                                    description: 'People who hold a specific token',
                                    children: () =>
                                        getValues().someProp === 'multiple' ? (
                                            <Box padding="lg">{getValues().someProp}</Box>
                                        ) : null,
                                },
                            ].map((option) => (
                                <RadioCard
                                    register={register}
                                    key={option.value}
                                    control={control}
                                    name="someProp"
                                    onClick={() => setValue('someProp', option.value)}
                                    {...option}
                                />
                            ))}
                        </>
                    )}
                </DummyReactHooksFormWrapper>
            </Container>
        </Stack>
    )
}

const Container = ({
    label,
    children,
    darkOnly,
    ...boxProps
}: { label: string; darkOnly?: boolean } & BoxProps) => (
    <Stack horizontal>
        {[darkClass, lightClass]
            .filter((c) => !darkOnly || c === darkClass)
            .map((c) => (
                <Stack grow padding key={c} className={c} background="default" color="default">
                    <Stack border grow rounded="xs">
                        <Box padding background="level2">
                            <Paragraph size="lg" color="gray2">
                                {label}
                            </Paragraph>
                        </Box>
                        <Stack padding gap {...boxProps}>
                            {children}
                        </Stack>
                    </Stack>
                </Stack>
            ))}
    </Stack>
)

export const Comment = (props: TextProps) => (
    <span {...props} className={atoms({ color: 'gray2' })} />
)

export default Playground
