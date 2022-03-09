import { MatrixClient } from "matrix-js-sdk";
export declare function useMatrixClientListener(homeServerUrl: string, initialSyncLimit?: number): {
    matrixClient: MatrixClient;
};
