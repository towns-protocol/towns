import { $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
} from "lexical";
import React, { useCallback, useLayoutEffect } from "react";
import { Button, Stack } from "@ui";

export const SendMarkdownPlugin = (props: {
  displayButtons?: boolean;
  onSend: (value: string) => void;
  onCancel?: () => void;
}) => {
  const { onSend } = props;
  const [editor] = useLexicalComposerContext();

  const { parseMarkdown } = useParseMarkdown(onSend);

  useLayoutEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (e: KeyboardEvent) => {
          if (!e.shiftKey) {
            parseMarkdown();
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, true);
            e.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, onSend, parseMarkdown]);

  const sendMessage = useCallback(() => {
    parseMarkdown();
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, true);
  }, [editor, parseMarkdown]);

  return props.displayButtons ? (
    <EditMessageButtons onCancel={props.onCancel} onSave={sendMessage} />
  ) : null;
};

const EditMessageButtons = (props: {
  onSave?: () => void;
  onCancel?: () => void;
}) => {
  return (
    <Stack horizontal gap>
      <Button size="button_sm" tone="cta1" onClick={props.onSave}>
        Save
      </Button>
      <Button size="button_sm" onClick={props.onCancel}>
        Cancel
      </Button>
    </Stack>
  );
};

const useParseMarkdown = (onEnterPress: (value: string) => void) => {
  const [editor] = useLexicalComposerContext();
  const parseMarkdown = useCallback(() => {
    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString();
      onEnterPress(markdown);
    });
  }, [editor, onEnterPress]);
  return { parseMarkdown };
};
