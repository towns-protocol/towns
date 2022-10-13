import { ComponentMeta, ComponentStory } from '@storybook/react'
import React from 'react'
import { StoryContainer } from 'stories/StoryUtils'
import { Logo } from './Logo'

export default {
    title: 'components/Logo',
    component: Logo,
    argTypes: {},
    parameters: {
        docs: {
            page: null,
        },
    },
} as ComponentMeta<typeof Logo>

const Template: ComponentStory<typeof Logo> = (props) => (
    <StoryContainer>
        <Logo />
    </StoryContainer>
)

export const Default = Template.bind({})
