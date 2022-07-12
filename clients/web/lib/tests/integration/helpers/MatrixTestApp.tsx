import { MatrixContextProvider } from "../../../src/components/MatrixContextProvider";

interface Props {
  homeServerUrl: string;
  defaultSpaceId?: string;
  defaultSpaceName?: string;
  defaultSpaceAvatarSrc?: string;
  children: JSX.Element;
}

export const MatrixTestApp = (props: Props) => {
  const {
    homeServerUrl,
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    children,
  } = props;
  return (
    <MatrixContextProvider
      homeServerUrl={homeServerUrl}
      defaultSpaceId={defaultSpaceId}
      defaultSpaceName={defaultSpaceName}
      defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
    >
      {children}
    </MatrixContextProvider>
  );
};
