import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Box } from "@ui";
import { Avatar } from "../../ui/components/Avatar/Avatar";

export default {
  title: "@ui/Avatar",
  component: Avatar,
  argTypes: {
    size: {
      defaultValue: "lg",
      control: "select",
    },
    src: {
      defaultValue: "ape.webp",
    },
  },
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof Avatar>;

const AvatarTemplate: ComponentStory<typeof Avatar> = (args) => (
  <Avatar {...args} />
);

export const AvatarStory = AvatarTemplate.bind({});
AvatarStory.storyName = "Avatar";
