import { Container } from "@mui/material";
import { Main } from "./components/Main";
import { MatrixContextProvider } from "use-matrix-client";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

const MATRIX_HOMESERVER_URL = "http://localhost:8008";
  //process.env.MATRIX_HOME_SERVER ?? "https://node1.hntlabs.com";

export function App(): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <MatrixContextProvider homeServerUrl={MATRIX_HOMESERVER_URL}>
          <Main />
        </MatrixContextProvider>
      </Container>
    </ThemeProvider>
  );
}

export default App;
