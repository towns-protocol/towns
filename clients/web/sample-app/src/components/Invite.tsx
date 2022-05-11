import { IconButton, Theme, Tooltip } from "@mui/material";

import GroupAddIcon from "@mui/icons-material/GroupAdd";

interface Props {
  onClick: () => void;
}

export function Invite(props: Props): JSX.Element {
  return (
    <Tooltip title="Invite">
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
        <GroupAddIcon />
      </IconButton>
    </Tooltip>
  );
}
