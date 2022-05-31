import { List, ListItem, ListItemText } from "@mui/material";
import { Membership, Room, isRoom, useMatrixStore } from "use-matrix-client";

import { useMemo } from "react";

interface Props {
  membership: Membership;
  onClickRoom: (roomId: string, membership: Membership) => void;
  isSpace: boolean;
}

export function Rooms(props: Props): JSX.Element {
  const { rooms } = useMatrixStore();
  const { isSpace, membership, onClickRoom } = props;

  const foundRooms = useMemo(() => {
    if (rooms) {
      const foundRooms: Room[] = [];
      for (const r of Object.values(rooms)) {
        if (
          isRoom(r) &&
          r.membership === membership &&
          r.isSpaceRoom === isSpace
        ) {
          foundRooms.push(r);
        }
      }

      return foundRooms;
    }

    return undefined;
  }, [isSpace, membership, rooms]);

  const roomItems = useMemo(() => {
    if (foundRooms) {
      const items = [];
      for (const r of foundRooms) {
        items.push(
          <ListItem
            button
            key={r.roomId}
            onClick={() => onClickRoom(r.roomId, membership)}
          >
            <ListItemText>{r.name}</ListItemText>
          </ListItem>,
        );
      }
      return items;
    }
    return undefined;
  }, [foundRooms, membership, onClickRoom]);

  return <List>{roomItems}</List>;
}
