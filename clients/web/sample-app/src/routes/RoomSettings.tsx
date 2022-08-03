import { TextField } from "@mui/material";
import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  PowerLevel,
  useZionClient,
  usePowerLevels,
  useRoom,
} from "use-zion-client";

export const RoomSettings = () => {
  const { spaceSlug, roomSlug } = useParams();
  const { setPowerLevel } = useZionClient();
  // if we have a room id, use it, otherwise pull up the space id
  const targetId = useMemo(() => roomSlug || spaceSlug, [roomSlug, spaceSlug]);
  const room = useRoom(targetId);
  const powerLevels = usePowerLevels(room?.id);
  const onLevelChanged = useCallback(
    (level: PowerLevel, newValue: number) => {
      if (room?.id) {
        setPowerLevel(room?.id, level, newValue);
      }
    },
    [setPowerLevel, room?.id],
  );
  return room ? (
    <>
      <h2>Settings</h2>
      <p>
        <b>RoomId:</b> {room.id.matrixRoomId}
      </p>
      <p>
        <b>IsSpaceRoom:</b> {room.isSpaceRoom ? "true" : "false"}
      </p>
      <ul>
        {powerLevels.levels.map((level) => (
          <PowerLevelView level={level} onLevelChanged={onLevelChanged} />
        ))}
      </ul>
    </>
  ) : (
    <div>
      <h2>Room Not Found</h2>
    </div>
  );
};

const PowerLevelView = (props: {
  level: PowerLevel;
  onLevelChanged: (level: PowerLevel, newValue: number) => void;
}) => {
  const { level, onLevelChanged } = props;
  const onTextFieldChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(event.target.value);
      onLevelChanged(level, newValue);
    },
    [level, onLevelChanged],
  );

  return (
    <li>
      <b>{level.definition.name}:</b> {level.definition.description}
      <TextField
        id={level.definition.key}
        value={level.value}
        onChange={onTextFieldChanged}
      />
      <br />
    </li>
  );
};
