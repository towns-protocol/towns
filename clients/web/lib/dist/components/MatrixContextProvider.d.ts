/// <reference types="react" />
import { MatrixClient } from "matrix-js-sdk";
export declare const MatrixContext: import("react").Context<MatrixClient>;
interface Props {
    homeServerUrl: string;
    initialSyncLimit?: number;
    children: JSX.Element;
}
export declare function MatrixContextProvider(props: Props): JSX.Element;
export {};
