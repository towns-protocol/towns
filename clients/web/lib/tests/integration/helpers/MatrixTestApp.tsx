import { MatrixContextProvider } from "../../../src/components/MatrixContextProvider";

interface Props {
  homeServerUrl: string;
  children: JSX.Element;
}

export const MatrixTestApp = (props: Props) => {
  const { homeServerUrl, children } = props;
  return (
    <MatrixContextProvider
      homeServerUrl={homeServerUrl}
    >
      {children}
    </MatrixContextProvider>
  );
};
