package cmd

import (
	"fmt"
	"slices"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

func init() {
	configCmd := &cobra.Command{
		Use:   "config",
		Short: "Config inspection commands",
	}
	rootCmd.AddCommand(configCmd)

	configCmd.AddCommand(&cobra.Command{
		Use:   "print",
		Short: "Print current config",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("Viper settings:")
			fmt.Println()

			viperAllSettings := cmdConfigBuilder.AllViperSettings()
			for key, value := range viperAllSettings {
				fmt.Printf("%s: %v\n", key, value)
			}

			fmt.Println()
			fmt.Println("Resulting config:")
			fmt.Println()

			configMap := make(map[string]interface{})
			if err := mapstructure.Decode(*cmdConfig, &configMap); err != nil {
				fmt.Printf("Failed to decode config struct: %v\n", err)
				return err
			}

			yamlData, err := yaml.Marshal(configMap)
			if err != nil {
				fmt.Printf("Failed to marshal config map to YAML: %v\n", err)
				return err
			}

			fmt.Println(string(yamlData))
			return nil
		},
	})

	configCmd.AddCommand(&cobra.Command{
		Use:   "names",
		Short: "Print environment variable names for all config settings",
		RunE: func(cmd *cobra.Command, args []string) error {
			envVars := cmdConfigBuilder.EnvMap()
			var keys []string
			for k := range envVars {
				keys = append(keys, k)
			}
			slices.Sort(keys)
			for _, k := range keys {
				fmt.Println(k, envVars[k])
			}
			return nil
		},
	})
}
