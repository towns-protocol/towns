import React, { useCallback, useRef } from "react";
import { ModalContainer } from "@components/Modals/ModalContainer";
import { Button, Heading, Stack, TextField } from "@ui";

export const AddLinkModal = (props: {
  onHide: () => void;
  onSaveLink: (link: string) => void;
}) => {
  const fieldRef = useRef<HTMLInputElement>(null);
  const onSave = useCallback(() => {
    const value = fieldRef.current?.value;
    if (value) {
      props.onSaveLink(value);
      props.onHide();
    }
  }, [props]);
  return (
    <ModalContainer onHide={props.onHide}>
      <Stack gap="lg">
        <Text strong size="lg">
          Add Link
        </Text>
        <TextField
          autoFocus
          ref={fieldRef}
          height="input_md"
          background="level2"
          label="Link"
          autoComplete="false"
          type="text"
          placeholder="e.g. https://mirror.xyz/"
        />
        <Stack horizontal gap justifyContent="end">
          <Button tone="neutral" onClick={props.onHide}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </Stack>
      </Stack>
    </ModalContainer>
  );
};
