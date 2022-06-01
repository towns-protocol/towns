import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
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
  <MemoryRouter>
    <TopBar />
  </MemoryRouter>
);

export const Default = Template.bind({});
