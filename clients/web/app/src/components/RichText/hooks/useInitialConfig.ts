import { $convertFromMarkdownString, Transformer } from "@lexical/markdown";
import {
  $createParagraphNode,
  $getRoot,
  $isElementNode,
  $setSelection,
  EditorThemeClasses,
  Klass,
  LexicalNode,
} from "lexical";
import { atoms } from "ui/styles/atoms.css";
import { $createAnnotationNode } from "../nodes/AnnotationNode";

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
};

export const useInitialConfig = (
  initialValue: string | undefined,
  nodes: Klass<LexicalNode>[],
  transformers: Transformer[],
  editable?: boolean,
  edited?: boolean,
) => {
  return {
    ...initialConfig,
    nodes,
    editable,
    editorState: () => {
      if (initialValue) {
        $convertFromMarkdownString(initialValue, transformers);
      }
      if (edited) {
        appendEditedNotation();
      }
      $setSelection(null);
    },
  };
};

function appendEditedNotation() {
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
