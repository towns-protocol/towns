import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { BackgroundImage } from "./BackgroundImage";

export default {
  title: "@ui/BackgroundImage",
  component: BackgroundImage,
  argTypes: {
    src: {
      defaultValue: "/placeholders/nft_1.png",
    },
  },
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof BackgroundImage>;

const Template: ComponentStory<typeof BackgroundImage> = (args) => (
  <StoryContainer>
    <BackgroundImage {...args} width="400" height="200" />
  </StoryContainer>
);

export const Default = Template.bind({});
Default.args = {};
