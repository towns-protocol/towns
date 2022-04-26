import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { Avatar } from "./Avatar";

export default {
  title: "@ui/Avatar",
  component: Avatar,
  argTypes: {
    size: {
      defaultValue: "lg",
      control: "select",
    },
    src: {
      defaultValue: "/placeholders/nft_1.png",
    },
  },
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof Avatar>;

const Template: ComponentStory<typeof Avatar> = (args) => (
  <StoryContainer>
    <Avatar {...args} />
  </StoryContainer>
);

export const Default = Template.bind({});
Default.args = {};
