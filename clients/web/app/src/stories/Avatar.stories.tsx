import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Avatar } from "ui/components/Avatar/Avatar";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "harmony/Avatar",
  component: Avatar,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Avatar>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Avatar> = (args) => {
  console.log(args);
  return <Avatar src="ape.webp" {...args} />;
};

export const Default = Template.bind({});

Default.args = {
  size: "lg",
  nft: false,
};
