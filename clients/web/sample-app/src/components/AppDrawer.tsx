import { Button, Theme } from "@mui/material";
import {
  Membership,
  getShortUsername,
  useMatrixStore,
} from "use-matrix-client";
import { useCallback, useMemo, useState } from "react";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import { Logout } from "./Logout";
import { Rooms } from "./Rooms";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarNewItemButton } from "./SidebarNewItemButton";

const drawerWidth = 240;

interface Props {
  /**
   * Injected by the documentation to work in an iframe.
   * You won"t need it on your project.
   */
  window?: () => Window;
}

export default function AppDrawer(props: Props): JSX.Element {
  const { window } = props;
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { username } = useMatrixStore();

  const myWalletAddress = useMemo(() => {
    if (username) {
      return getShortUsername(username);
    }
  }, [username]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);
  }, [mobileOpen]);

  const onClickRoom = (roomId: string, membership: Membership) => {
    navigate("/rooms/" + roomId);
  };

  const onClickCreateRoom = () => {
    navigate("/rooms/new");
  };

  const onHomeClick = () => {
    navigate("/");
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <SidebarNewItemButton label="Create Room" onClick={onClickCreateRoom} />
      <Divider />
      <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
        Joined
      </Typography>
      <Rooms membership={Membership.Join} onClickRoom={onClickRoom} />
      <Divider />
      <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
        Invited
      </Typography>
      <Rooms membership={Membership.Invite} onClickRoom={onClickRoom} />
    </div>
  );

  const container =
    window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Box display="flex" flexDirection="row" alignItems="center">
          <Button onClick={onHomeClick} variant="text">
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={spacingStyle}
              color="white"
            >
              Matrix Client
            </Typography>
          </Button>
          <Box display="flex" flexDirection="row" flexGrow={1} />
          <Box sx={spacingStyle} alignItems="right">
            {myWalletAddress}
          </Box>
          <Box sx={spacingStyle}>
            <Logout />
          </Box>
        </Box>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

const spacingStyle = {
  padding: (theme: Theme) => theme.spacing(2),
  gap: (theme: Theme) => theme.spacing(1),
};
