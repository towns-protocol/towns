import { EmojiData } from "emoji-mart";
import React from "react";
import { IconButton } from "@ui";
import { CardOpener } from "ui/components/Overlay/CardOpener";
import { baseline } from "ui/styles/vars.css";
import { EmojiPickerContainer } from "./EmojiPickerContainer";

type Props = {
  children?: React.ReactNode;
  onSelectEmoji: (data: EmojiData) => void;
};

const margin = { x: 0, y: baseline * 1 };

export const EmojiPickerButton = (props: Props) => {
  const { onSelectEmoji } = props;
  return (
    <CardOpener
      render={<EmojiPickerContainer onEmojiSelect={onSelectEmoji} />}
      margin={margin}
    >
      {({ triggerProps }) => (
        <IconButton icon="emoji" {...triggerProps} alignSelf="start" />
      )}
    </CardOpener>
  );
};
