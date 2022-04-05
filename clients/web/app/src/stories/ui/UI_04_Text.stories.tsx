import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Box } from "@ui";
import { Text } from "ui/components/Text/Text";

export default {
  title: "@ui/Text",
  component: Text,
  argTypes: {
    children: {
      control: "text",
      defaultValue: "Certainly the default value of the text",
    },
  },
} as ComponentMeta<typeof Text>;

const Template: ComponentStory<typeof Text> = (args) => {
  return (
    <Box absoluteFill centerContent>
      <Text {...args}>{args.children}</Text>
    </Box>
  );
};

export const TextStory = Template.bind({});
TextStory.storyName = "Text";
