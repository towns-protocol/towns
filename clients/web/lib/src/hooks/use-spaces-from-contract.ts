import { SpaceIdentifier, ZionClientEvent } from "../client/ZionClientTypes";
import { useEffect, useState } from "react";

import { DataTypes } from "@harmony/contracts/governance/types/ZionSpaceManager";
import { useZionClient } from "./use-zion-client";
import { useZionClientEvent } from "./use-zion-client-event";

export const useSpacesFromContract = (): SpaceIdentifier[] => {
  const { spaceManager } = useZionClient();
  const [spaceIdentifiers, setSpaceIdentifiers] = useState<SpaceIdentifier[]>(
    [],
  );
  const onNewSpace = useZionClientEvent(ZionClientEvent.NewSpace);

  useEffect(() => {
    if (!spaceManager) {
      return;
    }
    void (async () => {
      const spaces = await spaceManager.unsigned.getSpaces();
      if (spaces) {
        setSpaceIdentifiers(
          spaces.map((x: DataTypes.SpaceInfoStructOutput) => {
            return {
              id: x.spaceId,
              key: x.spaceId.toString(),
              name: x.name,
            };
          }),
        );
      }
    })();
  }, [spaceManager, onNewSpace]);

  return spaceIdentifiers;
};
