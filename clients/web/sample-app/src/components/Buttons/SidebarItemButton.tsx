import { Box, Button, IconButton, Theme, Typography } from "@mui/material";
import { CircleOutlined } from "@mui/icons-material";

interface Props {
  onClick: () => void;
  label: string;
}

export const SidebarItemButton = (props: Props) => {
  return (
    <Box
      display="flex"
      flexDirection="row"
      alignItems="center"
      sx={{
        pl: (theme: Theme) => theme.spacing(2),
      }}
    >
      <IconButton
        size="medium"
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={props.onClick}
        sx={{
          pr: (theme: Theme) => theme.spacing(1),
        }}
      >
        <CircleOutlined />
      </IconButton>
      <Button onClick={props.onClick}>
        <Typography
          variant="body1"
          noWrap
          component="div"
          sx={{
            pr: (theme: Theme) => theme.spacing(1),
          }}
        >
          {props.label}
        </Typography>
      </Button>
    </Box>
  );
};
