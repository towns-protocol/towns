import { Login } from "./Login";
import { LoginUsernamePassword } from "./LoginUsernamePassword";
import { useMatrixStore } from "use-zion-client";
import { Outlet } from "react-router-dom";

const debugWithPassword = false;

export function Main(): JSX.Element {
  const { isAuthenticated } = useMatrixStore();
  return (
    <div>
      {isAuthenticated ? (
        <Outlet />
      ) : debugWithPassword ? (
        <LoginUsernamePassword />
      ) : (
        <Login />
      )}
    </div>
  );
}
