import { useCallback, useMemo } from "react";
import { useStore } from "../store/store";

interface Props {
  spaceId: string;
}

export function SpaceSettings(props: Props): JSX.Element {
  const { allSpaceSettings, setRequireToken } = useStore();
  const spaceSetting = allSpaceSettings[props.spaceId];

  const requireToken = useMemo(() => {
    if (spaceSetting) {
      return spaceSetting.requireToken;
    }
    return false;
  }, [spaceSetting]);

  const onChangeValue = useCallback(
    function (event: React.ChangeEvent<HTMLInputElement>) {
      setRequireToken(props.spaceId, event.target.value === "true");
    },
    [props.spaceId, setRequireToken],
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
        />{" "}
        Require token
        <input
          type="radio"
          value="false"
          name="requireToken"
          checked={!requireToken}
        />{" "}
        No tokens required
      </fieldset>
    </div>
  );
}
