import { ComponentMeta, ComponentStory } from "@storybook/react";
import { Box } from "@ui";
import React from "react";
import { Icon } from "ui/components/Icon/Icon";

export default {
  title: "@ui/Icon",
  component: Icon,
} as ComponentMeta<typeof Icon>;

const Template: ComponentStory<typeof Icon> = (args) => {
  return (
    <Box absoluteFill centerContent>
      <Icon {...args} />
    </Box>
  );
};

export const IconStory = Template.bind({});
IconStory.storyName = "Icon";
