package cmd

import (
	"fmt"

	"github.com/mitchellh/mapstructure"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
)

func init() {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Print config",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Viper settings:")
			fmt.Println()

			for key, value := range viper.AllSettings() {
				fmt.Printf("%s: %v\n", key, value)
			}

			fmt.Println()
			fmt.Println("Resulting config:")
			fmt.Println()

			configMap := make(map[string]interface{})
			if err := mapstructure.Decode(cmdConfig, &configMap); err != nil {
				fmt.Printf("Failed to decode config struct: %v\n", err)
				return
			}

			yamlData, err := yaml.Marshal(configMap)
			if err != nil {
				fmt.Printf("Failed to marshal config map to YAML: %v\n", err)
				return
			}

			fmt.Println(string(yamlData))
		},
	}

	rootCmd.AddCommand(cmd)
}
