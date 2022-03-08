import { Container } from "@mui/material";
import { Main } from "./components/Main";
import { MatrixContextProvider } from "use-matrix-client";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

export function App(): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <MatrixContextProvider>
          <Main />
        </MatrixContextProvider>
      </Container>
    </ThemeProvider>
  );
}

export default App;
