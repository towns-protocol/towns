import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { QuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $getRoot,
  $isElementNode,
  $setSelection,
  EditorThemeClasses,
} from "lexical";
import { atoms } from "ui/styles/atoms.css";
import { $createAnnotationNode, AnnotationNode } from "../nodes/AnnotationNode";
import { EmojiNode } from "../nodes/EmojiNode";
import { MentionNode } from "../nodes/MentionNode";

const theme: EditorThemeClasses = {
  text: {
    code: atoms({ color: "accent" }),
    italic: atoms({ fontStyle: "italic" }),
    bold: atoms({ fontWeight: "strong" }),
  },
};

function onError(error: Error) {
  console.error(error);
}

const initialConfig = {
  namespace: "zion",
  theme,
  onError,
  nodes: [
    AnnotationNode,
    EmojiNode,
    LinkNode,
    ListItemNode,
    ListNode,
    MentionNode,
    QuoteNode,
  ],
};

export const useInitialConfig = (
  initialValue: string | undefined,
  readOnly?: boolean,
  edited?: boolean,
) => {
  return {
    ...initialConfig,
    readOnly,
    editorState: () => {
      if (initialValue) {
        $convertFromMarkdownString(initialValue, TRANSFORMERS);
      }
      if (edited) {
        const root = $getRoot();
        const lastChild = root.getLastChild();
        const lastElement = $isElementNode(lastChild)
          ? lastChild
          : $createParagraphNode();
        if (!lastChild) {
          root.append(lastElement);
        }

        const textNode = $createAnnotationNode(" (edited)");

        lastElement.append(textNode);
      }

      $setSelection(null);
    },
  };
};
