import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Theme,
  Typography,
} from "@mui/material";
import {
  CreateSpaceInfo,
  Membership,
  RoomIdentifier,
  RoomVisibility,
  useZionClient,
} from "use-zion-client";
import { useCallback, useMemo, useState } from "react";

import { SpaceSettings, TokenRequirement } from "../routes/SpaceSettings";
import { useAsyncButtonCallback } from "../hooks/use-async-button-callback";
import { useStore } from "../store/store";

const NEW_SPACE = "NEW_SPACE";

interface Props {
  onClick: (roomId: RoomIdentifier, membership: Membership) => void;
}

export const CreateSpaceForm = (props: Props) => {
  const [spaceName, setSpaceName] = useState<string>("");
  const [visibility, setVisibility] = useState<RoomVisibility>(
    RoomVisibility.Private,
  );
  const { createSpace, sendNotice } = useZionClient();
  const { onClick } = props;

  const { allSpaceSettings, setRequireToken } = useStore();
  const spaceSetting = allSpaceSettings[NEW_SPACE];

  const requireToken = useMemo(() => {
    if (spaceSetting) {
      return spaceSetting.requireToken;
    }
    return false;
  }, [spaceSetting]);

  const disableCreateButton = useMemo(
    () => spaceName.length === 0,
    [spaceName.length],
  );

  const onChangespaceName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSpaceName(event.target.value);
    },
    [],
  );

  const onChangeVisibility = useCallback((event: SelectChangeEvent) => {
    setVisibility(event.target.value as RoomVisibility);
  }, []);

  const onClickCreateSpace = useAsyncButtonCallback(async () => {
    const createSpaceInfo: CreateSpaceInfo = {
      name: spaceName,
      visibility,
    };
    const roomId = await createSpace(createSpaceInfo);
    if (roomId) {
      onClick(roomId, Membership.Join);
      const tokenRequirement = requireToken
        ? TokenRequirement.Required
        : TokenRequirement.None;
      await sendNotice(roomId, tokenRequirement);
      setRequireToken(roomId.matrixRoomId, requireToken);
      setRequireToken(NEW_SPACE, false);
    }
  }, [
    createSpace,
    onClick,
    requireToken,
    sendNotice,
    setRequireToken,
    spaceName,
    visibility,
  ]);

  const onSpaceAccessChangeValue = useCallback(
    async function (event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
      setRequireToken(NEW_SPACE, event.target.value === "true");
    },
    [setRequireToken],
  );

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        p: (theme: Theme) => theme.spacing(8),
      }}
    >
      <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
        CREATE SPACE
      </Typography>
      <Box display="grid" gridTemplateRows="repeat(5, 1fr)">
        <Box
          display="grid"
          alignItems="center"
          gridTemplateColumns="repeat(2, 1fr)"
          marginTop="10px"
        >
          <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
            Space name:
          </Typography>
          <TextField
            id="filled-basic"
            label="Name of the space"
            variant="filled"
            onChange={onChangespaceName}
          />
        </Box>
        <Box
          display="grid"
          alignItems="center"
          gridTemplateColumns="repeat(2, 1fr)"
          marginTop="20px"
        >
          <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
            Visibility:
          </Typography>
          <Box minWidth="120px">
            <FormControl fullWidth>
              <InputLabel id="visibility-select-label"></InputLabel>
              <Select
                labelId="visibility-select-label"
                id="visibility-select"
                value={visibility}
                onChange={onChangeVisibility}
              >
                <MenuItem value={RoomVisibility.Private}>private</MenuItem>
                <MenuItem value={RoomVisibility.Public}>public</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Box marginTop="20px">
          <SpaceSettings
            spaceId={NEW_SPACE}
            onChangeValue={onSpaceAccessChangeValue}
          />
        </Box>
        <Box
          display="grid"
          alignItems="center"
          gridTemplateColumns="repeat(2, 1fr)"
          marginTop="20px"
        ></Box>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={onClickCreateSpace}
            disabled={disableCreateButton}
          >
            Create
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const spacingStyle = {
  padding: (theme: Theme) => theme.spacing(2),
  gap: (theme: Theme) => theme.spacing(1),
};
