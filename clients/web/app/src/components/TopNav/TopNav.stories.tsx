import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { TopBar } from "./TopNav";

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

const Template: ComponentStory<typeof TopBar> = () => <TopBar />;

export const TopBarStory = Template.bind({});
TopBarStory.storyName = "TopBar";
