import React from 'react'
import { Box, Card, Paragraph, Stack } from '@ui'
import { PlusIcon } from 'ui/components/Icon'
import { Proposal } from './Proposal'

export const ProposalPage = () => (
    <Stack gap>
        <CreateProposal />
        <Proposal
            userId="1"
            title="Appoint a team admin to manage the moderation team"
            abstract={
                "This is a proposal for adding borrow/lend support for Rocket Pool's rETH on Aave."
            }
        />
        <Proposal
            userId="5"
            title="Start a viral twitter / social media campaign to make CAKE Bunny popular"
            abstract="We all know Pancake Bunny and the related CAKE mascots are very cute! Make cute cartoon videos and market CAKE it via Twitter, Youtube and other social media channels."
        />
        <Proposal
            results={0.6}
            userId="10"
            title="Conducting a social experiment"
            abstract={
                "Noticed that a large number of votes are created, in which people are asking for donations. And I wondered if the community would make a donation. Let's find out."
            }
        />
        <Proposal
            results={0.6}
            userId="15"
            title="Appoint a team admin to manage the moderation team"
            abstract={
                "Hello community! Deception ! I've already been scammed twice with NFT mines of Dalarnia! The first time there was a condition: to stake Cake in the first 24 hours for 52 weeks, still nothing! The second time in the bidding competition, I was ranked #40 in the DA..."
            }
        />
        <Proposal
            results={0.6}
            userId="20"
            title="Appoint a team admin to manage the moderation team"
            abstract={
                "This is a proposal for adding borrow/lend support for Rocket Pool's rETH on Aave."
            }
        />
    </Stack>
)

const CreateProposal = () => (
    <Card border padding horizontal gap alignItems="center" color="gray2">
        <Box border padding="sm" rounded="full">
            <PlusIcon />
        </Box>
        <Paragraph>Create a new paragraph</Paragraph>
    </Card>
)
