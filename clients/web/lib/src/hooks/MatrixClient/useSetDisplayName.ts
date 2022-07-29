import { MatrixContext } from "../../components/MatrixContextProvider";
import { useCallback, useContext } from "react";
import { ZionContext } from "../../types/matrix-types";

export const useSetDisplayName = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  return useCallback(
    async (newValue: string) => {
      try {
        if (matrixClient) {
          await matrixClient.setDisplayName(newValue);
          console.log(`updted display name to ${newValue}`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error updating display name`, ex.stack, ex);
      }
    },
    [matrixClient],
  );
};
