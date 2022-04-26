import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { UserInfo } from "./UserInfo";

export default {
  title: "components/UserInfo",
  component: UserInfo,
  argTypes: {},
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof UserInfo>;

const Template: ComponentStory<typeof UserInfo> = (props) => (
  <StoryContainer>
    <UserInfo {...props} />
  </StoryContainer>
);

export const Default = Template.bind({});
Default.args = {
  userId: "1",
};
