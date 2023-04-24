import axios, { AxiosResponse } from 'axios'
import React, { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast/headless'

import { AddressPill } from '@components/AddressPill'
import { richText } from '@components/RichText/RichTextEditor.css'
import { TextFieldWithPill } from '@components/TextFieldWithPill'
import {
    Avatar,
    Box,
    Button,
    Checkbox,
    Divider,
    Dropdown,
    Form,
    Grid,
    Heading,
    Icon,
    IconLabelButton,
    IconName,
    Paragraph,
    Pill,
    RadioCard,
    RadioSelect,
    Stack,
    Tooltip,
    TooltipRenderer,
    iconTypes,
} from '@ui'
import { FormRender } from 'ui/components/Form/Form'
import { vars } from 'ui/styles/vars.css'
import { env } from 'utils'
import { Accordion, AccordionGroup } from 'ui/components/Accordion/Accordion'
import { TownsTokenExample } from '@components/TownsToken/example/TownTokenExample'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'
import { VListExample } from '../../ui/components/VList/example/VListExample'
import { PageColors } from './pages/PageColors'
import { Container } from './components/PlaygroundContainer'

const A3 = Array(3)
    .fill(undefined)
    .map((_, i) => i)

export const Playground = () => {
    const [mockData, setMockData] = useState<AxiosResponse | null>(null)
    useEffect(() => {
        if (env.IS_DEV) {
            axios.get('/mock-endpoint').then(setMockData)
        }
    }, [])
    return (
        <Stack position="relative">
            <Container label="Notification">
                <Button
                    onClick={() =>
                        toast.custom((t) => (
                            <InvalidCookieNotification
                                toast={t}
                                actionMessage="edit your profile"
                            />
                        ))
                    }
                >
                    click
                </Button>
            </Container>
            <Container label="Towns Token">
                <TownsTokenExample size="sm" />
            </Container>
            <Container label="Accordion">
                <Accordion title="hello world" subTitle="some more info">
                    <>
                        <p>sdfosdifj</p>
                        <p>sdfosdifj</p>
                        <p>sdfosdifj</p>
                        <p>sdfosdifj</p>
                        <p>sdfosdifj</p>
                        <p>sdfosdifj</p>
                        <p>sdfosdifj</p>
                    </>
                </Accordion>
            </Container>
            <Container label="Automated accordion group">
                <AccordionGroup
                    accordions={[
                        {
                            id: '1',
                            title: 'hello world',
                            subTitle: 'some more info',
                            children: (
                                <>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                </>
                            ),
                        },
                        {
                            id: '2',
                            title: 'hello world',
                            subTitle: 'some more info',
                            children: (
                                <>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                    <p>sdfosdifj</p>
                                </>
                            ),
                        },
                    ]}
                />
            </Container>
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
                    <h2>
                        Heading with
                        <br />
                        two lines
                    </h2>
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

            <PageColors />

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
                <Divider label="icon label button" />
                <Box gap alignSelf="start" minWidth="250" alignItems="start">
                    <IconLabelButton label="Label" icon="plus" />
                </Box>
            </Container>

            <Container label="Pills">
                <Divider label="Address Pill" />
                <div>
                    <AddressPill address="0x17BA011308A820332fD0245a89E0551b6772d826" />
                </div>
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
                        <div key={b.toString()}>
                            <Box horizontal paddingY="sm">
                                <Box
                                    horizontal
                                    background="level3"
                                    display="block"
                                    key={b}
                                    padding={b as keyof typeof vars.space}
                                >
                                    <Box background="accent" square="square_xs" />
                                </Box>
                            </Box>
                            <Box justifyContent="center">
                                <Box>{b}</Box>
                            </Box>
                        </div>
                    ))}
                </Grid>

                <Divider label="Gap" />

                <Grid columns={2}>
                    {Object.keys(vars.space).map((b) => (
                        <div key={b.toString()}>
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
                                        <Box key={_} background="accent" square="square_xs" />
                                    ))}
                                </Box>
                            </Box>
                            <Box>
                                <Box>{b}</Box>
                            </Box>
                        </div>
                    ))}
                </Grid>
                <Divider label="direction" />
                <Grid columns={4}>
                    <Stack gap padding="sm" background="level3">
                        {A3.map((b) => (
                            <Box key={b} background="accent" square="square_xs" />
                        ))}
                    </Stack>
                    <Stack gap horizontal padding="sm" background="level3">
                        {A3.map((b) => (
                            <Box key={b} background="accent" square="square_xs" />
                        ))}
                    </Stack>
                </Grid>
            </Container>

            <Container label="Sample RadioCard">
                <FormRender
                    onSubmit={(data) => {
                        console.log(data)
                    }}
                >
                    {({ register, setValue, getValues, control, watch }) => (
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
                                        watch('someProp') === 'multiple' ? (
                                            <Box padding="lg">{getValues().someProp}</Box>
                                        ) : null,
                                },
                            ].map((option) => (
                                <RadioCard
                                    key={option.value}
                                    control={control}
                                    name="someProp"
                                    onClick={() => setValue('someProp', option.value)}
                                    {...option}
                                />
                            ))}
                            <Button type="submit">Submit</Button>
                        </>
                    )}
                </FormRender>
            </Container>
            <Container gap label="Checkbox">
                <Form<{
                    myGroup: string[]
                }>
                    defaultValues={{
                        myGroup: ['pizza'],
                    }}
                    onSubmit={(data) => {
                        console.log(data)
                    }}
                >
                    <Checkbox name="myGroup" label={<>🍕</>} value="pizza" />
                    <Checkbox name="myGroup" label="Spaghett" />
                    <Button type="submit">Submit</Button>
                </Form>
            </Container>

            <Container label="TextField With Pills inside">
                <FormRender<{
                    spaceIcon: File
                }>
                    mode="onChange"
                    onSubmit={(data) => {
                        console.log(data)
                    }}
                >
                    {({ register, formState, setError, clearErrors }) => (
                        <TextFieldWithPill
                            name="pills"
                            register={register}
                            pills={['abcd', '1234']}
                            renderPill={(arg) => <Pill key={arg}>{arg}</Pill>}
                        />
                    )}
                </FormRender>
            </Container>

            <Container darkOnly label="VList" padding="none">
                <Stack>
                    <VListExample />
                </Stack>
            </Container>
        </Stack>
    )
}

export default Playground
