import { randPhrase } from "@ngneat/falso";
import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { StoryContainer } from "stories/StoryUtils";
import { avatarSizes } from "ui/components/Avatar/avatarProperties.css";
import { Highlight } from "./Highlight";

export default {
  title: "components/Highlight",
  component: Highlight,
  argTypes: {
    size: {
      options: Object.keys(avatarSizes),
      control: "select",
    },
  },
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof Highlight>;

const Template: ComponentStory<typeof Highlight> = (props) => (
  <StoryContainer>
    <Highlight {...props}>
      <p>{randPhrase()}</p>
    </Highlight>
  </StoryContainer>
);

export const Default = Template.bind({});
Default.args = {
  userId: "1",
  imageSrc: "/placeholders/frame_5.png",
  space: "Azuki",
  channel: "general",
};

export const Background = Template.bind({});
Background.args = {
  ...Default.args,
  type: "background",
};
