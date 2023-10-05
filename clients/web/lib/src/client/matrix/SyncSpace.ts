import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'

export type MatrixSpaceHierarchy = {
    root: IHierarchyRoom
    children: IHierarchyRoom[]
}
