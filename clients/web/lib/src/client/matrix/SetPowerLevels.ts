import { EventType, ISendEventResponse, MatrixClient } from "matrix-js-sdk";
import { PowerLevel, RoomIdentifier } from "../../types/matrix-types";

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
