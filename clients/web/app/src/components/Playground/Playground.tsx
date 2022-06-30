import React, { useCallback, useState } from "react";
import {
  RichTextEditor,
  RichTextPreview,
} from "@components/RichText/RichTextEditor";
import { Stack } from "@ui";

export const Playground = () => {
  const [messages, setMessages] = useState<{ id: string; value: string }[]>([]);

  const onSend = useCallback((value: string) => {
    setMessages((m) => [...m, { id: Math.random().toString(), value }]);
  }, []);
  return (
    <Stack padding border centerContent height="100vh">
      <Stack gap grow>
        {messages.map((m) => (
          <RichTextPreview content={m.value} key={m.id} />
        ))}
      </Stack>
      <Stack gap padding>
        <RichTextEditor onSend={onSend} />
      </Stack>
    </Stack>
  );
};
