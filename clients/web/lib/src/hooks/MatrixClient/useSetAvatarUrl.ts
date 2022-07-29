import { MatrixContext } from "../../components/MatrixContextProvider";
import { useCallback, useContext } from "react";
import { ZionContext } from "../../types/matrix-types";

export const useSetAvatarUrl = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  return useCallback(
    async (newValue: string) => {
      try {
        if (matrixClient) {
          await matrixClient.setAvatarUrl(newValue);
          console.log(`updted avatar url to ${newValue}`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error updating avatar url`, ex.stack, ex);
      }
    },
    [matrixClient],
  );
};
