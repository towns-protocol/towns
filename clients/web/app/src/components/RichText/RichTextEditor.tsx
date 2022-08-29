import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { clsx } from "clsx";
import React, { useState } from "react";
import * as fieldStyles from "ui/components/_internal/Field/Field.css";
import { useInitialConfig } from "./hooks/useInitialConfig";
import { EmojiReplacePlugin } from "./plugins/EmojiReplacePlugin";
import { EmojiShortcutPlugin } from "./plugins/EmojiShortcutPlugin";
import { NewMentionsPlugin } from "./plugins/MentionsPlugin";
import { OnFocusPlugin } from "./plugins/OnFocusPlugin";
import { SendMarkdownPlugin } from "./plugins/SendMarkdownPlugin";
import * as styles from "./RichTextEditor.css";
import { RichTextPlaceholder } from "./ui/Placeholder/RichTextEditorPlaceholder";
import { RichTextUI } from "./ui/RichTextEditorUI";

type Props = {
  onSend?: (value: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  readOnly?: boolean;
  editing?: boolean;
  placeholder?: string;
  initialValue?: string;
  displayButtons?: boolean;
  container?: (props: { children: React.ReactNode }) => JSX.Element;
};

const fieldClassName = clsx([fieldStyles.field, styles.contentEditable]);

export const RichTextPreview = (props: {
  content: string;
  edited?: boolean;
}) => {
  const initialConfig = useInitialConfig(props.content, true, props.edited);

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
      <EmojiReplacePlugin />
      <NewMentionsPlugin />
      <EmojiShortcutPlugin />
      <SendMarkdownPlugin
        displayButtons={props.displayButtons}
        onSend={onSend}
        onCancel={props.onCancel}
      />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
};
