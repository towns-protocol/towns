import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Avatar } from "../../ui/components/Avatar/Avatar";
import { Box } from "@ui";

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
  <Box absoluteFill centerContent>
    <Avatar {...args} />
  </Box>
);

export const AvatarStory = AvatarTemplate.bind({});
AvatarStory.storyName = "Avatar";
