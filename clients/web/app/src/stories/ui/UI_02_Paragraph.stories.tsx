import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Box } from "@ui";
import React from "react";
import { Paragraph } from "ui/components/Text/Paragraph";

export default {
  title: "@ui/Paragraph",
  component: Paragraph,
  argTypes: {
    children: {
      control: "text",
      defaultValue: "Certainly the default value of the text",
    },
  },
} as ComponentMeta<typeof Paragraph>;

const ParagraphTemplate: ComponentStory<typeof Paragraph> = (args) => {
  return (
    <Box absoluteFill centerContent>
      <Paragraph {...args}>{args.children}</Paragraph>
    </Box>
  );
};

export const ParagraphStory = ParagraphTemplate.bind({});
ParagraphStory.storyName = "Paragraph";
