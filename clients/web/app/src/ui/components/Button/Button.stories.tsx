import { ComponentMeta, ComponentStory } from '@storybook/react'
import React from 'react'
import { StoryContainer } from 'stories/StoryUtils'
import { Button } from './Button'

export default {
    title: '@ui/Button',
    component: Button,
    argTypes: {
        children: {
            control: 'text',
            defaultValue: 'Action',
        },
    },
} as ComponentMeta<typeof Button>

const Template: ComponentStory<typeof Button> = (props) => (
    <StoryContainer>
        <Button {...props} />
    </StoryContainer>
)

export const ButtonStory = Template.bind({})
ButtonStory.storyName = 'Button'
