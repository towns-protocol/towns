import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { avatarSizes } from "ui/styles/atoms/properties/avatarProperties.css";
import { AvatarStack } from "./AvatarStack";

export default {
  title: "ui/AvatarStack",
  component: AvatarStack,
  argTypes: {
    size: {
      options: Object.keys(avatarSizes),
      control: "select",
    },
  },
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof AvatarStack>;

const Template: ComponentStory<typeof AvatarStack> = (props) => (
  <StoryContainer>
    <AvatarStack {...props} />
  </StoryContainer>
);

export const Default = Template.bind({});

Default.args = {
  userIds: ["1", "2", "3", "4", "5"],
  size: "md",
};

export const XLarge = Template.bind({});

XLarge.args = {
  ...Default.args,
  size: "xl",
};
