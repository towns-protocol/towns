import { $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
} from "lexical";
import { useCallback, useLayoutEffect } from "react";

export const SendMarkdownPlugin = (props: {
  onSend: (value: string) => void;
}) => {
  const { onSend: onEnterPress } = props;
  const [editor] = useLexicalComposerContext();

  const { parseMarkdown } = useParseMarkdown(onEnterPress);

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
  }, [editor, onEnterPress, parseMarkdown]);

  return null;
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
