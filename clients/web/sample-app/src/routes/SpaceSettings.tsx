import { useCallback, useMemo } from "react";
import { useSpaceData, useZionClient } from "use-zion-client";
import { useStore } from "../store/store";

export enum TokenRequirement {
  Required = "/require_token",
  None = "/require_none",
}

interface Props {
  spaceId: string;
  onChangeValue?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function SpaceSettings(props: Props): JSX.Element {
  const { allSpaceSettings, setRequireToken } = useStore();
  const spaceSetting = allSpaceSettings[props.spaceId];
  const space = useSpaceData();
  const { sendNotice } = useZionClient();

  const requireToken = useMemo(() => {
    if (spaceSetting) {
      return spaceSetting.requireToken;
    }
    return true;
  }, [spaceSetting]);

  const onChangeValue = useCallback(
    async function (event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
      if (props.onChangeValue) {
        return props.onChangeValue(event);
      } else {
        if (space?.id) {
          const isTokenRequired = event.target.value === "true";
          setRequireToken(space.id.matrixRoomId, isTokenRequired);
          const tokenRequirement = isTokenRequired
            ? TokenRequirement.Required
            : TokenRequirement.None;
          await sendNotice(space.id, tokenRequirement);
        }
      }
    },
    [props, sendNotice, setRequireToken, space?.id],
  );

  return (
    <div onChange={onChangeValue}>
      <fieldset>
        <legend>Space access</legend>
        <input
          type="radio"
          value="true"
          name="requireToken"
          checked={requireToken}
          readOnly
        />{" "}
        Require token
        <input
          type="radio"
          value="false"
          name="requireToken"
          checked={!requireToken}
          readOnly
        />{" "}
        No tokens required
      </fieldset>
    </div>
  );
}
