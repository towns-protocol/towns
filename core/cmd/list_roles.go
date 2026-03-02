package cmd

import (
	"context"
	"fmt"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/shared"

	"gopkg.in/yaml.v3"
)

func listRolesForSpace(ctx context.Context, cfg config.Config, spaceId shared.StreamId) error {
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
		return fmt.Errorf("could not initialize space contract (does space exist?); %w", err)
	}

	roles, err := spaceContract.GetRoles(ctx, spaceId)
	if err != nil {
		return fmt.Errorf("unable to fetch roles for space: %w", err)
	}

	d, err := yaml.Marshal(&roles)
	if err != nil {
		return err
	}

	fmt.Printf("Roles for space (%v):\n%s\n\n", spaceId, string(d))

	return nil
}

func init() {
	cmd := &cobra.Command{
		Use:   "list-roles <spaceId>",
		Short: "List all roles for a space",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			spaceStreamId, err := shared.StreamIdFromString(args[0])
			if err != nil {
				return fmt.Errorf("could not parse spaceId: %w", err)
			}
			return listRolesForSpace(cmd.Context(), *cmdConfig, spaceStreamId)
		},
	}

	rootCmd.AddCommand(cmd)
}
