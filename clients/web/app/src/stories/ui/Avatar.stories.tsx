import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Avatar } from "ui/components/Avatar/Avatar";

export default {
  title: "@ui/Avatar",
  component: Avatar,
  argTypes: {
    size: {
      default: "sm",
      control: "select",
    },
  },
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof Avatar>;

const Template: ComponentStory<typeof Avatar> = (args) => <Avatar {...args} />;

export const AvatarStory = Template.bind({});
AvatarStory.storyName = "Avatar";

AvatarStory.args = {
  size: "lg",
  nft: false,
  src: "ape.webp",
};
