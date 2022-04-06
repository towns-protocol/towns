import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Button } from "./Button";

export default {
  title: "@ui/Button",
  component: Button,
  argTypes: {
    children: {
      control: "text",
      defaultValue: "Action",
    },
  },
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = ({ children, ...props }) => {
  return <Button {...props}>{children}</Button>;
};

export const ButtonStory = Template.bind({});
ButtonStory.storyName = "Button";
