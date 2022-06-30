import React, { useCallback, useState } from "react";
import { Box, Stack } from "@ui";

import { Toolbar } from "./Toolbar/RichTextEditorToolbar";
import { RichTextEditorControls } from "./Controls/RichTextEditorControls";

export const RichTextUI = (props: {
  children: React.ReactNode;
  focused: boolean;
  readOnly?: boolean;
}) => {
  const [isTypeToggled, setTypeToggled] = useState(false);
  const onToggleType = useCallback(() => {
    setTypeToggled((s: boolean) => !s);
  }, []);
  return (
    <Stack
      padding
      gap
      rounded="sm"
      background={props.focused ? "level3" : "level2"}
      minWidth={props.readOnly ? undefined : "600"}
      position="relative"
    >
      {isTypeToggled && <Toolbar />}
      <Stack horizontal alignItems="center" gap="lg">
        <Box grow>{props.children}</Box>
        <RichTextEditorControls
          typeToggled={isTypeToggled}
          onToggleType={onToggleType}
        />
      </Stack>
      {/* <FieldOutline withBorder tone="neutral" /> */}
    </Stack>
  );
};
