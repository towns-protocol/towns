import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Replies } from "./Replies";

export default {
  title: "components/Replies",
  component: Replies,
  argTypes: {},
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof Replies>;

const Template: ComponentStory<typeof Replies> = () => (
  <Replies replies={{ userIds: [1, 2, 3], fakeLength: 10 }} />
);

export const TopBarStory = Template.bind({});
TopBarStory.storyName = "Replies";
