import React from 'react'
import { Badge, Box, Grid, Heading, Paragraph, Stack } from '@ui'
import { richText } from '@components/RichTextPlate/RichTextEditor.css'
import { Container } from '../components/PlaygroundContainer'

export const PageText = () => (
    <>
        <Container label="Paragraph">
            <Grid debug columns={2}>
                <Stack>
                    <Paragraph size="lg">Paragraph large</Paragraph>
                    <Paragraph>Paragraph medium</Paragraph>
                    <Paragraph size="sm">Paragraph small</Paragraph>
                    <Paragraph size="xs" fontWeight="strong">
                        P XS
                    </Paragraph>
                </Stack>
                <Stack>
                    <Paragraph size="lg" fontWeight="strong">
                        Paragraph large
                    </Paragraph>
                    <Paragraph fontWeight="strong">Paragraph medium</Paragraph>
                    <Paragraph size="sm" fontWeight="strong">
                        Paragraph small
                    </Paragraph>
                    <Paragraph size="xs" fontWeight="strong">
                        P XS
                    </Paragraph>
                </Stack>
            </Grid>
        </Container>
        <Container label="Badge">
            <Badge value="1" alignSelf="start" />
            <Badge value="2" alignSelf="start" />
            <Badge value="99" alignSelf="start" />
        </Container>
        <Container debug label="Headings">
            <Heading level={1}>Heading 1</Heading>
            <Heading level={2}>Heading 2</Heading>
            <Heading level={3}>Heading 3</Heading>
            <Heading marketingFont level={1}>
                Heading 1 / Marketing Font
            </Heading>
        </Container>
        <Container label="Text Content">
            <Box debug className={richText}>
                <h1>Heading</h1>
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
                    ICO thought lots of minimum dapp, but Ethereum threw away lots of deterministic
                    wallet. EOS thought the chain behind the transaction fee, or SHA 256 returns a
                    zero confirmation transaction! Although Bitcoin Cash did a minimum dapp, Waves
                    cost many instant gas.
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
    </>
)
