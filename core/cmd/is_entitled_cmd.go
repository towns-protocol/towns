package cmd

import (
	"context"
	"fmt"

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
	userId common.Address,
) error {
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")
	ctx = logging.CtxWithLog(ctx, logging.DefaultLogger(zapcore.InfoLevel))
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
		&cfg.AppRegistryContract,
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
		common.Address{},
	)

	isEntitledResult, err := chainAuth.IsEntitled(
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
	fmt.Printf("isEntitled: %v, reason: %v\n", isEntitledResult.IsEntitled(), isEntitledResult.Reason())
	return nil
}

func checkSpaceMembership(
	ctx context.Context,
	cfg config.Config,
	spaceId shared.StreamId,
	userId common.Address,
) error {
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")
	ctx = logging.CtxWithLog(ctx, logging.DefaultLogger(zapcore.InfoLevel))
	
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
		&cfg.AppRegistryContract,
		20,
		30000,
		metricsFactory,
	)
	if err != nil {
		return err
	}

	args := auth.NewChainAuthArgsForIsSpaceMember(
		spaceId,
		userId,
		common.Address{},
	)

	isEntitledResult, err := chainAuth.IsEntitled(
		ctx,
		&cfg,
		args,
	)
	if err != nil {
		return err
	}

	fmt.Printf("User %v membership status for space %v:\n", userId, spaceId.String())
	fmt.Printf("Is Member: %v\n", isEntitledResult.IsEntitled())
	fmt.Printf("Reason: %v\n", isEntitledResult.Reason())
	
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

			if !common.IsHexAddress(args[2]) {
				return fmt.Errorf("not a hex address: %s", args[2])
			}
			addr := common.HexToAddress(args[2])

			return isEntitledForSpaceAndChannel(cmd.Context(), *cmdConfig, spaceId, channelId, addr)
		},
	}

	isSpaceMemberCmd := &cobra.Command{
		Use:   "is-space-member <spaceId> <walletAddr>",
		Short: "Check if a user is a member of a space",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			spaceId, err := shared.StreamIdFromString(args[0])
			if err != nil {
				return fmt.Errorf("could not parse spaceId: %w", err)
			}

			if !common.IsHexAddress(args[1]) {
				return fmt.Errorf("not a hex address: %s", args[1])
			}
			addr := common.HexToAddress(args[1])

			return checkSpaceMembership(cmd.Context(), *cmdConfig, spaceId, addr)
		},
	}

	isEntitledCmd.AddCommand(isEntitledToChannelCmd)
	isEntitledCmd.AddCommand(isSpaceMemberCmd)
	// isEntitledCmd.AddCommand(isEntitledToSpaceCmd)
	rootCmd.AddCommand(isEntitledCmd)
}
