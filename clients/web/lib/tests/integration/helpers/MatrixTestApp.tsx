import { MatrixContextProvider } from "../../../src/components/MatrixContextProvider";

interface Props {
  defaultSpaceId?: string;
  defaultSpaceName?: string;
  defaultSpaceAvatarSrc?: string;
  children: JSX.Element;
}

export const MatrixTestApp = (props: Props) => {
  const { defaultSpaceId, defaultSpaceName, defaultSpaceAvatarSrc, children } =
    props;
  return (
    <MatrixContextProvider
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      homeServerUrl={process.env.HOMESERVER!}
      defaultSpaceId={defaultSpaceId}
      defaultSpaceName={defaultSpaceName}
      defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
    >
      {children}
    </MatrixContextProvider>
  );
};
