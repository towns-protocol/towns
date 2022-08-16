import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { QuoteNode } from "@lexical/rich-text";
import clsx from "clsx";
import { $setSelection, EditorThemeClasses } from "lexical";
import React, { useState } from "react";
import * as fieldStyles from "ui/components/_internal/Field/Field.css";
import { atoms } from "ui/styles/atoms.css";
import { OnFocusPlugin } from "./plugins/OnFocusPlugin";
import { SendMarkdownPlugin } from "./plugins/SendMarkdownPlugin";
import * as styles from "./RichTextEditor.css";
import { RichTextPlaceholder } from "./ui/Placeholder/RichTextEditorPlaceholder";
import { RichTextUI } from "./ui/RichTextEditorUI";

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
  nodes: [ListNode, ListItemNode, QuoteNode, LinkNode],
};

type Props = {
  onSend: (value: string) => void;
  autoFocus?: boolean;
  readOnly?: boolean;
  editing?: boolean;
  placeholder?: string;
  initialValue?: string;
  container?: (props: { children: React.ReactNode }) => JSX.Element;
};

const useInitialConfig = (
  initialValue: string | undefined,
  readOnly?: boolean,
) => {
  return {
    ...initialConfig,
    readOnly,
    editorState: () => {
      const state = initialValue
        ? $convertFromMarkdownString(initialValue, TRANSFORMERS)
        : undefined;
      $setSelection(null);
      return state;
    },
  };
};

const fieldClassName = clsx([fieldStyles.field, styles.contentEditable]);

export const RichTextPreview = (props: { content: string }) => {
  const initialConfig = useInitialConfig(props.content, true);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className={fieldClassName} />}
        placeholder=""
      />
    </LexicalComposer>
  );
};

export const RichTextEditor = (props: Props) => {
  const {
    placeholder = "Write something ...",
    editing: isEditing,
    onSend,
  } = props;
  const initialConfig = useInitialConfig(props.initialValue, false);

  const [focused, setFocused] = useState(false);
  const onFocusChange = (focus: boolean) => {
    setFocused(focus);
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextUI focused={focused} editing={isEditing}>
        <RichTextPlugin
          contentEditable={<ContentEditable className={fieldClassName} />}
          placeholder={<RichTextPlaceholder placeholder={placeholder} />}
        />
      </RichTextUI>
      <OnFocusPlugin
        autoFocus={props.autoFocus}
        onFocusChange={onFocusChange}
      />
      <ClearEditorPlugin />
      <MarkdownShortcutPlugin />
      <HistoryPlugin />
      <LinkPlugin />
      <SendMarkdownPlugin onSend={onSend} />

      <AutoFocusPlugin />
    </LexicalComposer>
  );
};
