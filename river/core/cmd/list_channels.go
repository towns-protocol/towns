package cmd

import (
	"context"
	"fmt"
	"math/big"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/spf13/cobra"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/auth"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/shared"

	"gopkg.in/yaml.v3"
)

func listChannelsForSpace(ctx context.Context, cfg config.Config, spaceId shared.StreamId) error {
	baseChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.BaseChain,
		nil,
		infra.NewMetricsFactory(prometheus.NewRegistry(), "", ""),
		nil,
	)
	if err != nil {
		return err
	}

	spaceContract, err := auth.NewSpaceContractV3(
		ctx,
		&cfg.ArchitectContract,
		&cfg.BaseChain,
		baseChain.Client,
	)
	if err != nil {
		return fmt.Errorf("could not initalize space contract (does space exist?); %w", err)
	}

	baseChannels, err := spaceContract.GetChannels(ctx, spaceId)
	if err != nil {
		return fmt.Errorf("unable to fetch roles for space: %w", err)
	}

	type PrintableChannel struct {
		Id       string
		Disabled bool
		Metadata string
		roleIds  []*big.Int
	}
	channels := make([]PrintableChannel, len(baseChannels))
	for i, channel := range baseChannels {
		channels[i] = PrintableChannel{
			Id:       channel.Id.String(),
			Disabled: channel.Disabled,
			Metadata: channel.Metadata,
			roleIds:  channel.RoleIds,
		}
	}

	d, err := yaml.Marshal(&channels)
	if err != nil {
		return err
	}

	fmt.Printf("Channels for space (%v):\n%s\n\n", spaceId, string(d))

	return nil
}

func init() {
	cmd := &cobra.Command{
		Use:   "list-channels <spaceId>",
		Short: "List all channels for a space",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			spaceStreamId, err := shared.StreamIdFromString(args[0])
			if err != nil {
				return fmt.Errorf("could not parse spaceId: %w", err)
			}
			return listChannelsForSpace(cmd.Context(), *cmdConfig, spaceStreamId)
		},
	}

	rootCmd.AddCommand(cmd)
}
