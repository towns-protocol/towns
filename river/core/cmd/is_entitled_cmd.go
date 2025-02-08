package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/spf13/cobra"
	"go.uber.org/zap/zapcore"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/xchain/entitlement"
)

func isEntitledForSpaceAndChannel(
	ctx context.Context,
	cfg config.Config,
	spaceId shared.StreamId,
	channelId shared.StreamId,
	userId string,
) error {
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")
	ctx = logging.CtxWithLog(ctx, logging.DefaultZapLogger(zapcore.InfoLevel))
	baseChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.BaseChain,
		nil,
		metricsFactory,
		nil,
	)
	if err != nil {
		return err
	}

	riverChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		metricsFactory,
		nil,
	)
	if err != nil {
		return err
	}

	chainConfig, err := crypto.NewOnChainConfig(
		ctx, riverChain.Client, cfg.RegistryContract.Address, riverChain.InitialBlockNum, riverChain.ChainMonitor)
	if err != nil {
		return err
	}

	evaluator, err := entitlement.NewEvaluatorFromConfig(
		ctx,
		&cfg,
		chainConfig,
		metricsFactory,
		nil,
	)
	if err != nil {
		return err
	}

	chainAuth, err := auth.NewChainAuth(
		ctx,
		baseChain,
		evaluator,
		&cfg.ArchitectContract,
		20,
		30000,
		metricsFactory,
	)
	if err != nil {
		return err
	}

	args := auth.NewChainAuthArgsForChannel(
		spaceId,
		channelId,
		userId,
		auth.PermissionRead,
	)

	isEntitled, err := chainAuth.IsEntitled(
		ctx,
		&cfg,
		args,
	)
	if err != nil {
		return err
	}

	fmt.Printf("User %v entitled to read permission for\n", userId)
	fmt.Printf(" - space   %v\n", spaceId.String())
	fmt.Printf(" - channel %v\n", channelId.String())
	fmt.Printf("%v\n", isEntitled)
	return nil
}

func init() {
	isEntitledCmd := &cobra.Command{
		Use:          "is-entitled",
		Short:        "Determine if a user is entitled to a space or channel",
		SilenceUsage: true,
	}

	// isEntitledToSpaceCmd := &cobra.Command{
	// 	Use:   "space <spaceId> <walletAddr>",
	// 	Short: "Determine if a user is entitled to a space",
	// 	Args:  cobra.ExactArgs(2),
	// 	RunE:  nil,
	// }

	isEntitledToChannelCmd := &cobra.Command{
		Use:   "channel <spaceId> <channelId> <walletAddr>",
		Short: "Determine if a user is entitled to a channel",
		Args:  cobra.ExactArgs(3),
		RunE: func(cmd *cobra.Command, args []string) error {
			spaceId, err := shared.StreamIdFromString(args[0])
			if err != nil {
				return fmt.Errorf("could not parse spaceId: %w", err)
			}
			channelId, err := shared.StreamIdFromString(args[1])
			if err != nil {
				return fmt.Errorf("could not parse channelId: %w", err)
			}

			rawUserId := args[2]
			addr := common.HexToAddress(rawUserId)
			// HexToAddress never fails, so convert the hex back to a raw string and see if the strings match,
			// case-insensitively.
			if !strings.EqualFold(addr.String(), rawUserId) {
				return fmt.Errorf("invalid address for walletAddr: %v, decodes to %v", rawUserId, addr.String())
			}

			return isEntitledForSpaceAndChannel(cmd.Context(), *cmdConfig, spaceId, channelId, rawUserId)
		},
	}

	isEntitledCmd.AddCommand(isEntitledToChannelCmd)
	// isEntitledCmd.AddCommand(isEntitledToSpaceCmd)
	rootCmd.AddCommand(isEntitledCmd)
}
