import { ComponentMeta, ComponentStory } from '@storybook/react'
import React from 'react'
import { StoryContainer } from 'stories/StoryUtils'
import { Reactions } from './Reactions'

export default {
    title: 'components/Reactions',
    component: Reactions,
    argTypes: {},
    parameters: {
        docs: {
            page: null,
        },
    },
} as ComponentMeta<typeof Reactions>

const Template: ComponentStory<typeof Reactions> = (props) => (
    <StoryContainer>
        <Reactions {...props} />
    </StoryContainer>
)

export const Default = Template.bind({})
Default.args = {
    reactions: new Map([
        [
            'heart',
            new Map([
                ['user_a', { eventId: '' }],
                ['user_b', { eventId: '' }],
            ]),
        ],
        ['smile', new Map([['user_a', { eventId: '' }]])],
        [
            'eyes',
            new Map([
                ['user_a', { eventId: '' }],
                ['user_b', { eventId: '' }],
            ]),
        ],
    ]),
}

export const Multiple = Template.bind({})
Multiple.args = { ...Default.args }

export const Single = Template.bind({})
Single.args = {
    ...Default.args,
    reactions: new Map([['smile', new Map([['user_a', { eventId: '' }]])]]),
}

export const Empty = Template.bind({})
Empty.args = { reactions: new Map() }
