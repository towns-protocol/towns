import { Container } from "@mui/material";
import { Main } from "./components/Main";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import { useMatrixClientListener } from "use-matrix-client";

export function App(): JSX.Element {
  useMatrixClientListener();
  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <Main />
      </Container>
    </ThemeProvider>
  );
}

export default App;
