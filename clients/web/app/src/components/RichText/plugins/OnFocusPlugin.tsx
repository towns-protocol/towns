import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { BLUR_COMMAND, COMMAND_PRIORITY_LOW, FOCUS_COMMAND } from "lexical";
import { useEffect, useLayoutEffect, useState } from "react";

type Props = {
  autoFocus?: boolean;
  onFocusChange: (focus: boolean) => void;
};

export const OnFocusPlugin = (props: Props) => {
  const [editor] = useLexicalComposerContext();
  const [hasFocus, setHasFocus] = useState(() => {
    return editor.getRootElement() === document?.activeElement;
  });

  useEffect(() => {
    if (!hasFocus && props.autoFocus) {
      const onKeyDown = () => {
        editor.focus(() => {
          // If we try and move selection to the same point with setBaseAndExtent, it won't
          // trigger a re-focus on the element. So in the case this occurs, we'll need to correct it.
          // Normally this is fine, Selection API !== Focus API, but fore the intents of the naming
          // of this plugin, which should preserve focus too.
          const activeElement = document.activeElement;
          const rootElement = editor.getRootElement() as HTMLDivElement;
          if (
            !rootElement.contains(activeElement) ||
            rootElement !== null ||
            activeElement === null
          ) {
            // Note: preventScroll won't work in Webkit.
            rootElement.focus({ preventScroll: true });
          }
        });
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [editor, hasFocus, props.autoFocus]);

  useLayoutEffect(() => {
    setHasFocus(editor.getRootElement() === document.activeElement);
    return mergeRegister(
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          setHasFocus(true);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          setHasFocus(false);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  useEffect(() => {
    props.onFocusChange(hasFocus);
  }, [hasFocus, props]);

  return null;
};
