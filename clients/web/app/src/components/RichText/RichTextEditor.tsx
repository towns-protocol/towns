import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { clsx } from "clsx";
import { RoomMember } from "matrix-js-sdk";
import React, { useMemo, useState } from "react";
import { useSpaceMembers } from "use-zion-client";
import * as fieldStyles from "ui/components/_internal/Field/Field.css";
import { notUndefined } from "ui/utils/utils";
import { useInitialConfig } from "./hooks/useInitialConfig";
import { AnnotationNode } from "./nodes/AnnotationNode";
import { EmojiNode } from "./nodes/EmojiNode";
import { MentionNode, createMentionTransformer } from "./nodes/MentionNode";
import { AutoLinkMatcherPlugin } from "./plugins/AutoLinkMatcherPlugin";
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

const nodes = [
  CodeNode,
  HeadingNode,
  AnnotationNode,
  EmojiNode,
  AutoLinkNode,
  LinkNode,
  ListItemNode,
  ListNode,
  MentionNode,
  QuoteNode,
];

const useTransformers = (members: RoomMember[]) => {
  const transformers = useMemo(() => {
    const names = members.map((m) => m.user?.displayName).filter(notUndefined);
    return [...TRANSFORMERS, createMentionTransformer(names)];
  }, [members]);
  return { transformers };
};

export const RichTextPreview = React.memo(
  (props: { content: string; edited?: boolean }) => {
    // note: unnecessary repetition here, could be optimised by handling above
    // inside e.g. space context or timeline
    const { members } = useSpaceMembers();
    const { transformers } = useTransformers(members);

    const initialConfig = useInitialConfig(
      props.content,
      nodes,
      transformers,
      true,
      props.edited,
    );

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={<ContentEditable className={fieldClassName} />}
          placeholder=""
        />
      </LexicalComposer>
    );
  },
);

export const RichTextEditor = (props: Props) => {
  const {
    placeholder = "Write something ...",
    editing: isEditing,
    onSend,
  } = props;

  const { members } = useSpaceMembers();
  const { transformers } = useTransformers(members);

  const initialConfig = useInitialConfig(
    props.initialValue,
    nodes,
    transformers,
    false,
  );

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
      <MarkdownShortcutPlugin transformers={transformers} />
      <HistoryPlugin />
      <LinkPlugin />
      <EmojiReplacePlugin />
      <NewMentionsPlugin members={members} />
      <EmojiShortcutPlugin />
      <SendMarkdownPlugin
        displayButtons={props.displayButtons}
        onSend={onSend}
        onCancel={props.onCancel}
      />
      <AutoFocusPlugin />
      <AutoLinkMatcherPlugin />
    </LexicalComposer>
  );
};
