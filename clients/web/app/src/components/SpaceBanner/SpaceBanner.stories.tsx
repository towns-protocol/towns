import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { SpaceBanner } from "./SpaceBanner";

export default {
  title: "components/SpaceBanner",
  component: SpaceBanner,
  argTypes: {},
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof SpaceBanner>;

const Template: ComponentStory<typeof SpaceBanner> = () => (
  <StoryContainer stacked>
    <SpaceBanner />
  </StoryContainer>
);

export const Default = Template.bind({});
