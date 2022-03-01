import * as React from "react";

import { Button, IconButton, Theme } from "@mui/material";
import { Membership, isRoom, useStore } from "use-matrix-client";
import { useCallback, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import { Chat } from "./Chat";
import { CreateRoomForm } from "./CreateRoomForm";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import { Logout } from "./Logout";
import { Rooms } from "./Rooms";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const drawerWidth = 240;

interface Props {
  /**
   * Injected by the documentation to work in an iframe.
   * You won"t need it on your project.
   */
  window?: () => Window;
}

interface CurrentChatRoom {
  roomId: string;
  membership: Membership;
}

export default function AppDrawer(props: Props): JSX.Element {
  const { window } = props;
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<CurrentChatRoom>();
  const { rooms, username } = useStore();
  const [showCreateRoomForm, setShowCreateRoomForm] = useState<boolean>(false);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);
  }, [mobileOpen]);

  const onClickRoom = useCallback((roomId: string, membership: Membership) => {
    setShowCreateRoomForm(false);
    setCurrentChatRoom({
      roomId,
      membership,
    });
  }, []);

  const onClickCreateRoom = useCallback(() => {
    setShowCreateRoomForm(true);
  }, []);

  const onClickLeaveRoom = useCallback(() => {
    if (rooms) {
      for (const r of Object.values(rooms)) {
        if (isRoom(r) && r.membership === Membership.Join && r.roomId !== currentChatRoom?.roomId) {
          setCurrentChatRoom({
            roomId: r.roomId,
            membership: r.membership,
          });
        }
      }
    }
  }, [currentChatRoom?.roomId, rooms]);

  const goToRoom = useCallback((roomId: string) => {
    if (rooms) {
      const room = rooms[roomId];
      if (room) {
        setCurrentChatRoom({
          roomId: roomId,
          membership: Membership.Join,
        });
      }
    }
  }, [rooms]);

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        sx={{
          pl: (theme: Theme) => theme.spacing(2)
        }}>
        <IconButton
          size="medium"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onClickCreateRoom}
          sx={{
            pr: (theme: Theme) => theme.spacing(1)
          }}>
          <AddIcon />
        </IconButton>
        <Button onClick={onClickCreateRoom}>
          <Typography
            variant="body1"
            noWrap
            component="div"
            sx={{
              pr: (theme: Theme) => theme.spacing(1)
            }}>
            Create Room
          </Typography>
        </Button>
      </Box>
      <Divider />
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={spacingStyle}>
        Joined
      </Typography>
      <Rooms membership={Membership.Join} onClickRoom={onClickRoom} />
      <Divider />
      <Typography
        variant="h6"
        noWrap
        component="div"
        sx={spacingStyle}>
        Invited
      </Typography>
      <Rooms membership={Membership.Invite} onClickRoom={onClickRoom} />
    </div>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

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
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={spacingStyle}>
            Matrix Client
          </Typography>
          <Box display="flex" flexDirection="row" flexGrow={1} />
          <Box sx={spacingStyle}>
            {username}
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
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
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
        }}>
        <Toolbar />
        {showCreateRoomForm ?
          <CreateRoomForm onClick={onClickRoom} />
          :
          currentChatRoom ?
          <Chat
            roomId={currentChatRoom.roomId}
            membership={currentChatRoom.membership}
            onClickLeaveRoom={onClickLeaveRoom}
            goToRoom={goToRoom} />
          :
          null}
      </Box>
    </Box>
  );
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
};
