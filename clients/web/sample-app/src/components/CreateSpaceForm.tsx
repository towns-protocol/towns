import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Theme,
  Typography,
} from "@mui/material";
import {
  CreateSpaceInfo,
  Membership,
  RoomIdentifier,
  RoomVisibility,
  useIntegratedSpaceManagement,
  useWeb3Context,
} from "use-zion-client";
import { useCallback, useMemo, useState } from "react";

import { useAsyncButtonCallback } from "../hooks/use-async-button-callback";
import { ethers } from "ethers";

interface Props {
  onClick: (roomId: RoomIdentifier, membership: Membership) => void;
}

export const CreateSpaceForm = (props: Props) => {
  const { chainId, accounts, getProvider } = useWeb3Context();
  const [spaceName, setSpaceName] = useState<string>("");
  const [visibility, setVisibility] = useState<RoomVisibility>(
    RoomVisibility.Private,
  );
  const { createSpaceWithZionTokenEntitlement } =
    useIntegratedSpaceManagement();
  const { onClick } = props;

  const disableCreateButton = useMemo(
    () => spaceName.length === 0,
    [spaceName.length],
  );

  const onChangespaceName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSpaceName(event.target.value);
    },
    [],
  );

  const onClickFundWallet = useCallback(
    (account: string) => {
      const afunc = async () => {
        const provider = getProvider();
        if (!provider) {
          throw new Error("No provider");
        }
        // anvil default funded address #1
        const privateKey =
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        const wallet = new ethers.Wallet(privateKey, provider);
        const amount = 0.1;
        const tx = {
          from: wallet.address,
          to: account,
          value: ethers.utils.parseEther(amount.toString()),
          gasLimit: 1000000,
        };
        const result = await wallet.sendTransaction(tx);
        console.log(result);
      };
      void afunc();
    },
    [getProvider],
  );

  const onChangeVisibility = useCallback((event: SelectChangeEvent) => {
    setVisibility(event.target.value as RoomVisibility);
  }, []);

  const onClickCreateSpace = useAsyncButtonCallback(async () => {
    const createSpaceInfo: CreateSpaceInfo = {
      name: spaceName,
      visibility,
    };
    const roomId = await createSpaceWithZionTokenEntitlement(createSpaceInfo);
    if (roomId) {
      onClick(roomId, Membership.Join);
    }
  }, [spaceName, visibility]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        p: (theme: Theme) => theme.spacing(8),
      }}
    >
      <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
        CREATE SPACE
      </Typography>

      <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
        ChainId: {chainId}
      </Typography>
      <Box display="grid" gridTemplateRows="repeat(5, 1fr)">
        <Box
          display="grid"
          alignItems="center"
          gridTemplateColumns="repeat(2, 1fr)"
          marginTop="10px"
        >
          <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
            Space name:
          </Typography>
          <TextField
            id="filled-basic"
            label="Name of the space"
            variant="filled"
            onChange={onChangespaceName}
          />
        </Box>
        <Box
          display="grid"
          alignItems="center"
          gridTemplateColumns="repeat(2, 1fr)"
          marginTop="20px"
        >
          <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
            Visibility:
          </Typography>
          <Box minWidth="120px">
            <FormControl fullWidth>
              <InputLabel id="visibility-select-label"></InputLabel>
              <Select
                labelId="visibility-select-label"
                id="visibility-select"
                value={visibility}
                onChange={onChangeVisibility}
              >
                <MenuItem value={RoomVisibility.Private}>private</MenuItem>
                <MenuItem value={RoomVisibility.Public}>public</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Box
          display="grid"
          alignItems="center"
          gridTemplateColumns="repeat(2, 1fr)"
          marginTop="20px"
        ></Box>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Button
            variant="contained"
            color="primary"
            onClick={onClickCreateSpace}
            disabled={disableCreateButton}
          >
            Create
          </Button>
        </Box>
        {chainId === "0x539" &&
          accounts.map((accountId) => (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              key={accountId}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={() => onClickFundWallet(accountId)}
                disabled={false}
              >
                Fund Wallet (debug) ({accountId})
              </Button>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

const spacingStyle = {
  padding: (theme: Theme) => theme.spacing(2),
  gap: (theme: Theme) => theme.spacing(1),
};
