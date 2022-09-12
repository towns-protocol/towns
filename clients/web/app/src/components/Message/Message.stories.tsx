import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { Paragraph } from "@ui";
import { StoryContainer } from "stories/StoryUtils";
import { themes } from "ui/styles/themes";
import { vars } from "ui/styles/vars.css";
import { Message } from "./Message";

export default {
  title: "components/Message",
  component: Message,
  argTypes: {
    avatar: {
      type: "string",
      defaultValue: "/placeholders/nft_2.png",
    },
    condensed: {
      type: "boolean",
      defaultValue: false,
    },
    channel: {
      type: "string",
      defaultValue: "channelname",
    },

    reactions: {
      defaultValue: {
        "❤️": 13,
        "☀️": 2,
      },
    },
    replies: {
      defaultValue: { userIds: [1, 2, 3, 5] },
    },
    timestamp: {
      defaultValue: Date.now() - 3600000 * 4,
    },
    name: {
      defaultValue: "display22",
      type: "string",
    },
    background: {
      options: Object.keys(themes.dark.background),
      defaultValue: "level2",
    },
    padding: {
      options: Object.keys(vars.space),
      defaultValue: "md",
    },
    rounded: {
      options: Object.keys(vars.borderRadius),
      defaultValue: "md",
    },
  },
  parameters: {
    docs: {
      page: null,
    },
  },
} as ComponentMeta<typeof Message>;

const Template: ComponentStory<typeof Message> = (props) => (
  <StoryContainer>
    <Message {...props}>
      <Paragraph>Text content of the message goes here</Paragraph>
    </Message>
  </StoryContainer>
);

export const Default = Template.bind({});
Default.args = {
  background: "default",
  rounded: "md",
  padding: "lg",
};

export const Minimal = Template.bind({});
Minimal.args = {
  ...Default.args,
  background: "default",
  padding: "lg",
  reactions: undefined,
  replies: undefined,
};

export const Reactions = Template.bind({});
Reactions.args = {
  ...Default.args,
  replies: undefined,
};

export const Condensed = Template.bind({});
Condensed.args = {
  ...Default.args,
  condensed: true,
  replies: undefined,
};
