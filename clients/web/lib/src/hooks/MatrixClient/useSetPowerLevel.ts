import { MatrixContext } from "../../components/MatrixContextProvider";
import { EventType, ISendEventResponse, MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import {
  PowerLevel,
  RoomIdentifier,
  ZionContext,
} from "../../types/matrix-types";

export const useSetPowerLevel = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  return useCallback(
    async (roomId: RoomIdentifier, current: PowerLevel, newValue: number) => {
      try {
        if (matrixClient) {
          const room = await setZionPowerLevel(
            matrixClient,
            roomId,
            current,
            newValue,
          );
          console.log(
            `updted power level ${current.definition.key} for room[${roomId.matrixRoomId}] from ${current.value} to ${newValue}`,
            room,
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error joining room[${roomId.matrixRoomId}]`, ex.stack);
      }
    },
    [matrixClient],
  );
};

export function setZionPowerLevel(
  matrixClient: MatrixClient,
  roomId: RoomIdentifier,
  current: PowerLevel,
  newValue: number,
): Promise<ISendEventResponse> {
  const room = matrixClient.getRoom(roomId.matrixRoomId);
  if (!room) {
    throw new Error(`Room ${roomId.matrixRoomId} not found`);
  }

  const powerLevelsEvent = room.currentState.getStateEvents(
    EventType.RoomPowerLevels,
    "",
  );
  const def = current.definition;
  const powerLevels = powerLevelsEvent ? powerLevelsEvent.getContent() : {};
  const newPowerLevels = { ...powerLevels };
  if (def.parent) {
    newPowerLevels[def.parent] = {
      ...powerLevels[def.parent],
      [current.definition.key]: newValue,
    };
  } else {
    newPowerLevels[current.definition.key] = newValue;
  }
  return matrixClient.sendStateEvent(
    roomId.matrixRoomId,
    EventType.RoomPowerLevels,
    newPowerLevels,
  );
}
