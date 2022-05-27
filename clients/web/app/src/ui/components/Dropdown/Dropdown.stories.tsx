import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { Dropdown } from "./Dropdown";

export default {
  title: "ui/Dropdown",
  component: Dropdown,
  argTypes: {},
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof Dropdown>;

const Template: ComponentStory<typeof Dropdown> = (props) => (
  <StoryContainer>
    <Dropdown {...props} />
  </StoryContainer>
);

export const Default = Template.bind({});
Default.args = {
  label: "Fruit",
  icon: "lock",
  options: [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Lemon", value: "lemon" },
  ],
};

export const ToneCritical = Template.bind({});
ToneCritical.args = {
  ...Default.args,
  tone: "critical",
};

export const TonePositive = Template.bind({});
TonePositive.args = {
  ...Default.args,
  tone: "positive",
};

export const Icon = Template.bind({});
Icon.args = {
  ...Default.args,
  icon: "lock",
};
