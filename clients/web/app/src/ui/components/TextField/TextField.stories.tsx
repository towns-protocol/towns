import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { Avatar } from "../Avatar/Avatar";
import { TextField } from "./TextField";

export default {
  title: "ui/TextField",
  component: TextField,

  argTypes: {},
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof TextField>;

const Template: ComponentStory<typeof TextField> = (props) => (
  <StoryContainer>
    <TextField {...props} />
  </StoryContainer>
);

export const Default = Template.bind({});
Default.args = {
  label: "Text Label",
  placeholder: "Placeholder...",
  icon: "threads",
};

export const ToneCritical = Template.bind({});
ToneCritical.args = {
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
  icon: "search",
};

export const After = Template.bind({});
After.args = {
  ...Default.args,
  icon: "plus",
  after: <Avatar />,
};

export const Background = Template.bind({});
Background.args = {
  ...Default.args,
  background: "level3",
};
