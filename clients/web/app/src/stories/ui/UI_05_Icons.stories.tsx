import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Icon } from "ui/components/Icon/Icon";

export default {
  title: "@ui/Icon",
  component: Icon,
} as ComponentMeta<typeof Icon>;

const Template: ComponentStory<typeof Icon> = (args) => {
  return <Icon {...args} />;
};

export const IconStory = Template.bind({});
IconStory.storyName = "Icon";
