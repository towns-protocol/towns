import { ComponentMeta, ComponentStory } from '@storybook/react'
import React from 'react'
import { Text } from 'ui/components/Text/Text'

export default {
    title: '@ui/Text',
    component: Text,
    argTypes: {
        children: {
            control: 'text',
            defaultValue: 'Certainly the default value of the text',
        },
    },
} as ComponentMeta<typeof Text>

const Template: ComponentStory<typeof Text> = (args) => {
    return <Text {...args}>{args.children}</Text>
}

export const TextStory = Template.bind({})
TextStory.storyName = 'Text'
