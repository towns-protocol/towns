import { EmojiData } from "emoji-mart";

import Picker from "@emoji-mart/react";
import React, { useCallback, useContext } from "react";

import { Box } from "@ui";
import { CardOpenerContext } from "ui/components/Overlay/CardOpener";
import { vars } from "ui/styles/vars.css";
import { emojiPickerClassName } from "./EmojiPickerContainer.css";

export const EmojiPickerContainer = (props: {
  onEmojiSelect: (data: EmojiData) => void;
}) => {
  const cardOpenerContext = useContext(CardOpenerContext);

  const onEmojiSelect = useCallback(
    (data: EmojiData) => {
      cardOpenerContext.closeCard?.();
      props.onEmojiSelect(data);
    },
    [cardOpenerContext, props],
  );

  return (
    <Box className={emojiPickerClassName} insetX="xs">
      <Picker
        className={emojiPickerClassName}
        previewPosition="none"
        theme="dark"
        emojiButtonColors={[vars.color.background.level3]}
        onEmojiSelect={onEmojiSelect}
      />
    </Box>
  );
};
