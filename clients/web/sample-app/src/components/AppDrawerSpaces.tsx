import { List, ListItem, ListItemText, Typography } from "@mui/material";
import { RoomIdentifier, useZionContext } from "use-zion-client";

import { Theme } from "@mui/system";
import { SpaceItem } from "use-zion-client/dist/types/matrix-types";
import { useCallback } from "react";

interface Props {
  onClickSpace: (id: RoomIdentifier) => void;
}

export function AppDrawerSpaces(props: Props): JSX.Element {
  const { onClickSpace } = props;
  const { spaces, spaceUnreads, spaceMentionCounts } = useZionContext();
  const formatNameWithUnreads = useCallback(
    (space: SpaceItem) => {
      const unreadPostfix =
        spaceUnreads[space.id.matrixRoomId] === true ? " *" : "";
      const mentionPostfix =
        spaceMentionCounts[space.id.matrixRoomId] > 0
          ? ` (${spaceMentionCounts[space.id.matrixRoomId]})`
          : "";
      return `${space.name}${unreadPostfix}${mentionPostfix}`;
    },
    [spaceMentionCounts, spaceUnreads],
  );
  return (
    <>
      <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
        Spaces
      </Typography>
      <List>
        {spaces.map((s) => (
          <ListItem button key={s.id.slug} onClick={() => onClickSpace(s.id)}>
            <ListItemText>{formatNameWithUnreads(s)}</ListItemText>
          </ListItem>
        ))}
      </List>
    </>
  );
}

const spacingStyle = {
  padding: (theme: Theme) => theme.spacing(2),
  gap: (theme: Theme) => theme.spacing(1),
};
