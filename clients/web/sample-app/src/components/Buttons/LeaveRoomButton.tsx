import { IconButton, Theme, Tooltip } from "@mui/material";

import ExitToAppIcon from "@mui/icons-material/ExitToApp";

interface Props {
  onClick: () => Promise<void>;
}

export function LeaveRoomButton(props: Props): JSX.Element {
  return (
    <Tooltip title="Leave room">
      <IconButton
        size="medium"
        edge="start"
        color="inherit"
        aria-label="invite"
        onClick={() => props.onClick()}
        sx={{
          pr: (theme: Theme) => theme.spacing(1),
        }}
      >
        <ExitToAppIcon />
      </IconButton>
    </Tooltip>
  );
}
