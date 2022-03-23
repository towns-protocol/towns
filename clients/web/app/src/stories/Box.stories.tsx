import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Box } from "../ui/components/Box/Box";

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: "Example/Box",
  component: Box,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    backgroundColor: { control: "color" },
  },
} as ComponentMeta<typeof Box>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Box> = (args) => (
  <Box {...args}>content</Box>
);

export const Primary = Template.bind({});
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Primary.args = {
  padding: "md",
};

export const Secondary = Template.bind({});
Secondary.args = {
  padding: "lg",
};

export const Large = Template.bind({});

Large.args = {
  square: "md",
};

export const Small = Template.bind({});

Small.args = {
  square: "sm",
};
