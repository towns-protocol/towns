import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import useEvent from "react-use-event-hook";

import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { createPortal } from "react-dom";
import { Box, RootLayerContext, Stack } from "@ui";

import { TooltipContext } from "ui/components/Tooltip/TooltipRenderer";
import { richTextEditorUI } from "../RichTextEditor.css";
import { RichTextEditorControls } from "./Controls/RichTextEditorControls";
import { InlineToolbar } from "./InlineToolbar";
import { AddLinkModal } from "./LinkModal";
import { Toolbar } from "./Toolbar/RichTextEditorToolbar";

export const RichTextUI = (props: {
  children: React.ReactNode;
  focused: boolean;
  readOnly?: boolean;
}) => {
  const [isTypeToggled, setTypeToggled] = useState(false);
  const onToggleType = useCallback(() => {
    setTypeToggled((s: boolean) => !s);
  }, []);

  const absoluteRef = useRef<HTMLDivElement>(null);

  const [linkLinkModal, setLinkModal] = useState(false);
  const onHideModal = useEvent(() => {
    setLinkModal(false);
  });

  const onLinkClick = useEvent(() => {
    setLinkModal(true);
  });

  const [editor] = useLexicalComposerContext();
  const onSaveLink = useEvent((url: string) => {
    console.log({ editor, url });
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  });
  const [toolbarPosition, setToolbarPosition] = useState<{
    top: number;
    left: number;
  }>();

  const updateToolbarPosition = useCallback(() => {
    const selection = $getSelection();
    const nativeSelection = window.getSelection();
    const rootElement = editor.getRootElement();

    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const domRange = nativeSelection.getRangeAt(0);
      let rect;

      if (nativeSelection.anchorNode === rootElement) {
        let inner = rootElement;
        while (inner.firstElementChild != null) {
          inner = inner.firstElementChild as HTMLElement;
        }
        rect = inner.getBoundingClientRect();
      } else {
        rect = domRange.getBoundingClientRect();
      }

      const parentBounds = absoluteRef.current?.getBoundingClientRect();

      if (!parentBounds) {
        return;
      }

      setToolbarPosition({
        top: rect.top - parentBounds.top,
        left: rect.left - parentBounds.left,
      });
    }
  }, [editor]);

  const onCloseToolbar = useEvent(() => {
    setToolbarPosition(undefined);
  });

  useEffect(() => {
    const onResize = () => {
      editor.getEditorState().read(() => {
        updateToolbarPosition();
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [editor, updateToolbarPosition]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateToolbarPosition();
    });
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbarPosition();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbarPosition();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateToolbarPosition]);

  const { rootLayerRef } = useContext(RootLayerContext);

  return (
    <Stack
      gap
      className={richTextEditorUI}
      rounded="sm"
      background={props.focused ? "level3" : "level2"}
      minWidth={props.readOnly ? undefined : "200"}
      position="relative"
    >
      {isTypeToggled && <Toolbar />}
      <Stack horizontal alignItems="center" gap="lg">
        <Box grow>{props.children}</Box>
        <RichTextEditorControls
          typeToggled={isTypeToggled}
          onToggleType={onToggleType}
        />

        {!isTypeToggled &&
          rootLayerRef?.current &&
          createPortal(
            <Box
              absoluteFill
              padding="lg"
              ref={absoluteRef}
              pointerEvents="none"
            >
              <InlineToolbar
                position={toolbarPosition}
                onClose={onCloseToolbar}
                onAddLinkClick={onLinkClick}
              />
            </Box>,
            rootLayerRef?.current,
          )}
        {linkLinkModal && (
          <AddLinkModal onHide={onHideModal} onSaveLink={onSaveLink} />
        )}
      </Stack>
    </Stack>
  );
};
