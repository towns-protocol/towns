import { MatrixContextProvider } from "../../../src/components/MatrixContextProvider";

interface Props {
  defaultSpaceId?: string;
  defaultSpaceName?: string;
  defaultSpaceAvatarSrc?: string;
  initialSyncLimit?: number;
  children: JSX.Element;
}

export const MatrixTestApp = (props: Props) => {
  const {
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    initialSyncLimit,
    children,
  } = props;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const homeServerUrl = process.env.HOMESERVER!;
  return (
    <MatrixContextProvider
      homeServerUrl={homeServerUrl}
      defaultSpaceId={defaultSpaceId}
      defaultSpaceName={defaultSpaceName}
      defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
      initialSyncLimit={initialSyncLimit}
    >
      {children}
    </MatrixContextProvider>
  );
};
