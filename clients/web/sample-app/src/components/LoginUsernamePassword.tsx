import {
  Alert,
  Box,
  Button,
  Snackbar,
  TextField,
  Theme,
  Typography,
} from "@mui/material";
import { useMatrixClient, useMatrixStore } from "use-matrix-client";
import { useCallback, useEffect, useState } from "react";

import { makeStyles } from "@mui/styles";

export function LoginUsernamePassword(): JSX.Element {
  const styles = useStyles();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showError, setShowError] = useState<string | undefined>(undefined);
  const { loginWithPassword, registerNewUser } = useMatrixClient();
  const { loginError } = useMatrixStore();

  const onChangedUsername = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(event.target.value);
    },
    []
  );

  const onChangedPassword = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
    },
    []
  );

  const onLogin = useCallback(
    async function () {
      loginWithPassword(username, password);
    },
    [loginWithPassword, password, username]
  );

  const onRegister = useCallback(
    async function () {
      registerNewUser(username, password);
    },
    [password, registerNewUser, username]
  );

  const onCloseAlert = useCallback(function () {
    setShowError(undefined);
  }, []);

  useEffect(() => {
    if (loginError?.message) {
      setShowError(loginError.message);
    } else {
      setShowError("");
    }
  }, [loginError]);

  return (
    <div className={styles.container}>
      <Box sx={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            marginTop: "5px",
            alignItems: "Center",
          }}
        >
          <Typography variant="h6" component="span">
            Username:
          </Typography>
          <TextField variant="filled" onChange={onChangedUsername} />
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            marginTop: "10px",
            alignItems: "Center",
          }}
        >
          <Typography variant="h6" component="span">
            Password:
          </Typography>
          <TextField
            variant="filled"
            type="password"
            onChange={onChangedPassword}
          />
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            margin: "10px",
            alignItems: "Center",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            sx={{ margin: "10px" }}
            onClick={onRegister}
          >
            Register
          </Button>
          <Button
            variant="contained"
            color="primary"
            sx={{ margin: "10px" }}
            onClick={onLogin}
          >
            Login
          </Button>
        </Box>
      </Box>
      <Snackbar
        open={showError ? true : false}
        autoHideDuration={5000}
        onClose={onCloseAlert}
      >
        <Alert onClose={onCloseAlert} severity="error">
          {showError}
        </Alert>
      </Snackbar>
    </div>
  );
}

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    backgroundColor: theme.palette.common.white,
    borderRadius: "25px",
    padding: theme.spacing(8),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));
