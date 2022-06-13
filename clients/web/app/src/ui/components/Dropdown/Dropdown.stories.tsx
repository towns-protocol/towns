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
  label: "Chain",
  icon: "lock",
  options: [
    { label: "Mainet", value: "1" },
    { label: "Arbitrum One", value: "42161" },
    { label: "Optimism", value: "10" },
  ],
};

export const ToneNegative = Template.bind({});
ToneNegative.args = {
  ...Default.args,
  tone: "negative",
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
