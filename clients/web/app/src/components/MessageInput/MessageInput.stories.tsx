import { ComponentMeta, ComponentStory } from '@storybook/react'
import React from 'react'
import { StoryContainer } from 'stories/StoryUtils'
import { MessageInput } from './MessageInput'

export default {
    title: 'components/MessageInput',
    component: MessageInput,
    argTypes: {},
    parameters: {
        docs: {
            page: null,
        },
    },
} as ComponentMeta<typeof MessageInput>

const Template: ComponentStory<typeof MessageInput> = (props) => (
    <StoryContainer>
        <MessageInput {...props} />
    </StoryContainer>
)

export const Default = Template.bind({})
Default.args = {}

export const Medium = Template.bind({})
Medium.args = {
    ...Default.args,
    size: 'input_md',
}

export const Large = Template.bind({})
Large.args = {
    ...Default.args,
    size: 'input_lg',
}
