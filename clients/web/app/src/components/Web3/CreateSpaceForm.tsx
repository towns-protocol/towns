import { Visibility } from "matrix-js-sdk/lib/@types/partials";
import React, { useCallback, useMemo, useState } from "react";
import {
  CreateSpaceInfo,
  Membership,
  useMatrixClient,
} from "use-matrix-client";
import { atoms } from "ui/styles/atoms/atoms.css";
import {
  Box,
  Button,
  Dropdown,
  Heading,
  Paragraph,
  Stack,
  TextField,
} from "@ui";

interface Props {
  onClick: (roomId: string, membership: Membership) => void;
}

export const CreateSpaceForm = (props: Props) => {
  const VisibilityOptions = [Visibility.Private, Visibility.Public];
  const [spaceName, setSpaceName] = useState<string>("");
  const [visibility, setVisibility] = useState<Visibility>(Visibility.Public);
  const { createSpace } = useMatrixClient();

  const disableCreateButton = useMemo(
    () => spaceName.length === 0,
    [spaceName.length],
  );

  const onSpaceNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSpaceName(event.target.value);
    },
    [],
  );

  const onClickCreateSpace = useCallback(async () => {
    if (disableCreateButton) {
      console.log("please enter a space name");
      return;
    }
    const createSpaceInfo: CreateSpaceInfo = {
      spaceName,
      visibility,
    };
    const roomId = await createSpace(createSpaceInfo);

    if (roomId) {
      console.log("space created with id", roomId);
      props.onClick(roomId, Membership.Join);
    }
  }, [createSpace, props, spaceName, visibility, disableCreateButton]);

  return (
    <Stack padding gap="lg" minWidth="400">
      <Stack gap="lg">
        <TextField
          autoFocus
          background="level2"
          label="Space Name"
          secondaryLabel="(required)"
          description="This is your official space name that you own. Your space's URL will contain the same name."
          placeholder="Space Name"
          onChange={onSpaceNameChange}
        />

        <Dropdown
          background="level2"
          label="Visibility"
          message=""
          options={VisibilityOptions.map((value) => ({
            label: value,
            value,
          }))}
          defaultValue={visibility}
          onChange={(value) => setVisibility(value as Visibility)}
        />

        <Box gap="md">
          <Heading level={4}>Space URL</Heading>
          <Paragraph>This is what your official URL will look like</Paragraph>
          <Paragraph strong truncate size="md" display="inline-block">
            zion.xyz/
            <span className={atoms({ color: "gray2" })}>{spaceName}</span>
          </Paragraph>
        </Box>
      </Stack>
      <Button size="input_lg" onClick={onClickCreateSpace}>
        Create
      </Button>
    </Stack>
  );
};
