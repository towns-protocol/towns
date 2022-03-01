import { Alert, Box, Button, Snackbar, TextField, Theme, Typography } from "@mui/material";
import { useCallback, useState } from "react";

import { makeStyles } from "@mui/styles";
import { useMatrixClient } from "use-matrix-client";

export function Login(): JSX.Element {
  const styles = useStyles();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showError, setShowError] = useState<string | undefined>(undefined);
  const { loginWithPassword, registerNewUser } = useMatrixClient();

  const onChangedUsername = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  }, []);

  const onChangedPassword = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  }, []);

  const onLogin = useCallback(async function () {
    const result = await loginWithPassword(username, password);
    if (result.accessToken) {
      console.log(`User ${username} logged in`);
    } else {
      console.error(`Cannot login user ${username}. ${result.error}`);
      setShowError(result.error);
    }
  }, [loginWithPassword, password, username]);

  const onRegister = useCallback(async function () {
    const result = await registerNewUser(username, password);
    if (result.accessToken) {
      console.log(`registered new user ${username}`);
    } else {
      console.error(`Cannot register user ${username}. ${result.error}`);
      setShowError(result.error);
    }
  }, [password, registerNewUser, username]);

  const onCloseAlert = useCallback(function () {
    setShowError(undefined);
  }, []);

  return (
    <div className={styles.container}>
      <Box sx={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", marginTop: "5px", alignItems: "Center" }}>
          <Typography variant="h6" component="span">
            Username:
          </Typography>
          <TextField variant="filled" onChange={onChangedUsername}/>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", marginTop: "10px", alignItems: "Center" }}>
          <Typography variant="h6" component="span">
            Password:
          </Typography>
          <TextField variant="filled" type="password" onChange={onChangedPassword} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", margin: "10px", alignItems: "Center" }}>
          <Button variant="contained" color="primary" sx={{ margin: "10px"}} onClick={onRegister}>
            Register
          </Button>
          <Button variant="contained" color="primary" sx={{ margin: "10px"}} onClick={onLogin}>
            Login
          </Button>
        </Box>
      </Box>
      <Snackbar
        open={showError ? true : false}
        autoHideDuration={5000}
        onClose={onCloseAlert}>
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