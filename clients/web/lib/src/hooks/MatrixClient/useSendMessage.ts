import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";

export const useSendMessage = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: string, message: string): Promise<void> => {
      if (matrixClient) {
        const content = {
          body: `${message}`,
          msgtype: "m.text",
        };

        await matrixClient.sendEvent(
          roomId,
          "m.room.message",
          content,
          "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          function (err: any, res: any) {
            if (err) {
              console.error(err);
            }
          },
        );
      }
    },
    [matrixClient],
  );
};
