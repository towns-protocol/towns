import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useEvent from "react-use-event-hook";
import { useWeb3Context } from "use-matrix-client";
import { vars } from "ui/styles/vars.css";
import {
  Avatar,
  Box,
  Button,
  Heading,
  Icon,
  RadioSelect,
  Stack,
  TextField,
} from "@ui";

const placeholders = {
  names: [
    "ben.eth",
    "benrbn.eth",
    "selashtalk.eth",
    "lupi.eth",
    "genius.eth",
    "hello.eth",
    "1345.eth",
    "jimmicricket.eth",
    "looper.eth",
  ],
  nfts: Array(20)
    .fill(0)
    .map((_, index) => `/placeholders/nft_${index + 1}.png`),
};

export const SignupForm = () => {
  const { accounts } = useWeb3Context();
  const { setValue, resetField, register, handleSubmit, watch, formState } =
    useForm({
      defaultValues: {
        walletAddress: accounts[0],
        ens: undefined,
        displayName: "",
        nft: "",
      },
    });

  const navigate = useNavigate();

  const onSubmit = (data: { displayName: string }) => {
    navigate("/");
  };
  const [fieldENS, fieldDisplayName, fieldNFT] = watch([
    "ens",
    "displayName",
    "nft",
  ]);

  const isENS = placeholders.names.includes(fieldDisplayName);

  const resetENSField = useEvent(() => {
    resetField("ens", undefined);
  });

  useEffect(() => {
    if (!isENS) {
      resetENSField();
    }
  }, [isENS, resetENSField]);

  useEffect(() => {
    if (fieldENS) {
      setValue("displayName", fieldENS, { shouldValidate: true });
    }
  }, [fieldENS, setValue]);

  return (
    <Stack
      gap="lg"
      minWidth="600"
      as="form"
      autoCorrect="off"
      onSubmit={handleSubmit(onSubmit)}
    >
      <TextField
        autoFocus
        readOnly
        background="level2"
        label="Connected Wallet"
        secondaryLabel="(required)"
        description="Your wallet is your identity. It will be associated with your Zion account. You will have the option to switch wallets later."
        placeholder="0x00"
        after={<Icon type="wallet" />}
        {...register("walletAddress")}
      />

      <Stack gap="sm">
        <TextField
          autoFocus
          autoCorrect="off"
          background="level2"
          tone={formState.errors.displayName ? "negative" : undefined}
          inputColor={isENS ? "etherum" : undefined}
          label="Display Name"
          secondaryLabel="(required)"
          description="This is how others will see you"
          placeholder="Enter a display name"
          autoComplete="off"
          after={isENS && <Icon type="verified" />}
          {...register("displayName", { required: true })}
        />

        {!!placeholders.names?.length && (
          <Box padding border rounded="sm">
            <RadioSelect
              label="(Optional) Set an ENS as your username:"
              renderLabel={(label) => (
                <Heading level={5} color="gray2">
                  {label}
                </Heading>
              )}
              columns={2}
              options={placeholders.names.map((value) => ({
                value,
                label: value,
              }))}
              applyChildProps={() => register("ens", { required: false })}
            />
          </Box>
        )}
      </Stack>

      {!!placeholders.nfts.length && (
        <RadioSelect
          columns="60px"
          description="You will be able to change this per space later."
          label="NFT profile picture"
          render={(value, selected) => (
            <MotionBox
              rounded="full"
              border="strong"
              animate={{
                opacity: !!fieldNFT && !selected ? 0.5 : 1,
                borderColor: !selected
                  ? `rgba(255,255,255,0)`
                  : vars.color.foreground.default,
              }}
            >
              <Avatar src={value} size="avatar_lg" />
            </MotionBox>
          )}
          options={placeholders.nfts.map((value) => ({ value, label: value }))}
          applyChildProps={() => register("nft", { required: false })}
        />
      )}
      <Button type="submit" size="input_lg" tone="cta1">
        Submit
      </Button>
    </Stack>
  );
};

const MotionBox = motion(Box);
