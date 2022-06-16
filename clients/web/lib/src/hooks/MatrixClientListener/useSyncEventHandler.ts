import { MatrixClient, Room } from "matrix-js-sdk";
import { MutableRefObject, useCallback, useEffect, useState } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";

export const useSyncEventHandler = (
  matrixClientRef: MutableRefObject<MatrixClient | undefined>,
) => {
  const [syncInfo, setSyncInfo] = useState<unknown>();
  const { setAllRooms } = useMatrixStore();

  useEffect(() => {
    if (matrixClientRef.current) {
      console.log(`Sync all rooms`);
      const rooms = matrixClientRef.current.getRooms();
      printRooms(rooms);
      setAllRooms(rooms);
    }
  }, [matrixClientRef, setAllRooms, syncInfo]);

  const handleSyncAll = useCallback(function () {
    // Force a sync by mutating the state.
    setSyncInfo({});
  }, []);

  return handleSyncAll;
};

function printRooms(rooms: Room[]): void {
  for (const r of rooms) {
    printRoom(r);
  }
}

function printRoom(room: Room): void {
  if (room) {
    console.log(
      `    Room[${room.roomId}] = { name: "${
        room.name
      }", membership: ${room.getMyMembership()} }`,
    );
  } else {
    console.log(`"room" is undefined. Cannot print.`);
  }
}
