import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { StoryContainer } from "stories/StoryUtils";
import { TopBar } from "./TopBar";

export default {
  title: "components/TopBar",
  component: TopBar,
  argTypes: {},
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof TopBar>;

const Template: ComponentStory<typeof TopBar> = () => (
  <StoryContainer stacked>
    <TopBar authenticated userId="0xff" username="username" />
  </StoryContainer>
);

export const Default = Template.bind({});
