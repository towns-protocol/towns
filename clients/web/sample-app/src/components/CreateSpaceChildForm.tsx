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
import { CreateRoomInfo, Membership, useMatrixClient } from "use-matrix-client";
import { useCallback, useMemo, useState } from "react";

import { Visibility } from "matrix-js-sdk/lib/@types/partials";
import { useAsyncButtonCallback } from "../hooks/use-async-button-callback";

interface Props {
  parentSpaceId: string;
  onClick: (roomId: string, membership: Membership) => void;
}

export function CreateSpaceChildForm(props: Props): JSX.Element {
  const [roomName, setRoomName] = useState<string>("");
  const [visibility, setVisibility] = useState<Visibility>(Visibility.Private);
  const { createRoom } = useMatrixClient();
  const { onClick, parentSpaceId } = props;

  const disableCreateButton = useMemo(
    () => roomName.length === 0,
    [roomName.length],
  );

  const onChangeRoomName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRoomName(event.target.value);
    },
    [],
  );

  const onChangeVisibility = useCallback((event: SelectChangeEvent) => {
    setVisibility(event.target.value as Visibility);
  }, []);

  const onClickCreateRoom = useAsyncButtonCallback(async () => {
    const createRoomInfo: CreateRoomInfo = {
      roomName,
      visibility,
      isDirectMessage: false,
      parentSpaceId: parentSpaceId,
    };
    const roomId = await createRoom(createRoomInfo);
    if (roomId) {
      onClick(roomId, Membership.Join);
    }
  }, [createRoom, onClick, parentSpaceId, roomName, visibility]);

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
        CREATE CHANNEL
      </Typography>
      <Box display="grid" gridTemplateRows="repeat(5, 1fr)">
        <Box
          display="grid"
          alignItems="center"
          gridTemplateColumns="repeat(2, 1fr)"
          marginTop="10px"
        >
          <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
            Channel name:
          </Typography>
          <TextField
            id="filled-basic"
            label="Name of the channel"
            variant="filled"
            onChange={onChangeRoomName}
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
                <MenuItem value={Visibility.Private}>private</MenuItem>
                <MenuItem value={Visibility.Public}>public</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Box></Box>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={onClickCreateRoom}
            disabled={disableCreateButton}
          >
            Create
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

const spacingStyle = {
  padding: (theme: Theme) => theme.spacing(2),
  gap: (theme: Theme) => theme.spacing(1),
};
