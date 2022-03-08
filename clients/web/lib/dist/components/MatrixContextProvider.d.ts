/// <reference types="react" />
import { MatrixClient } from "matrix-js-sdk";
export declare const MatrixContext: import("react").Context<MatrixClient>;
export declare function MatrixContextProvider({ children }: {
    children: any;
}): JSX.Element;
