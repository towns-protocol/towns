import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Box } from "@ui";
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
  return <Paragraph {...args}>{args.children}</Paragraph>;
};

export const ParagraphStory = ParagraphTemplate.bind({});
ParagraphStory.storyName = "Paragraph";
