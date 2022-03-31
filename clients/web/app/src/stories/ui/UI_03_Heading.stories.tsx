import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Box } from "@ui";
import React from "react";
import { Heading } from "ui/components/Text/Heading";

export default {
  title: "@ui/Heading",
  component: Heading,
  argTypes: {
    level: {
      defaultValue: 1,
      control: { type: "range", min: 1, max: 6, step: 1 },
    },
    children: {
      control: "text",
      defaultValue: "Certainly the default value of the text",
    },
  },
} as ComponentMeta<typeof Heading>;

const HeadingTemplate: ComponentStory<typeof Heading> = (args) => {
  return (
    <Box absoluteFill centerContent>
      <Heading {...args}>{args.children}</Heading>
    </Box>
  );
};

export const HeadingStory = HeadingTemplate.bind({});
HeadingStory.storyName = "Heading";
