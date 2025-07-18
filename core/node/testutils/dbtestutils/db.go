package dbtestutils

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/towns-protocol/towns/core/config"
)

func GetTestDbUrl() string {
	dbUrl := os.Getenv("TEST_DATABASE_URL")
	if dbUrl != "" {
		return dbUrl
	}
	return "postgres://postgres:postgres@localhost:5433/river?sslmode=disable&pool_max_conns=1000"
}

func DeleteTestSchema(ctx context.Context, dbUrl string, schemaName string) error {
	if dbUrl == "" {
		return nil
	}

	if os.Getenv("RIVER_TEST_DUMP_DB") != "" {
		cmd := exec.Command(
			"pg_dump",
			"-Fp",
			"-d",
			"postgres://postgres:postgres@localhost:5433/river?sslmode=disable",
			"-n",
			schemaName,
		)
		var out bytes.Buffer
		cmd.Stdout = &out
		err := cmd.Run()
		if err != nil {
			fmt.Printf("Failed to execute pg_dump: %v\n", err)
		} else {
			fmt.Println(out.String())
		}
	}

	conn, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		fmt.Printf("Failed to connect to database: %v", err)
		return err
	}
	defer conn.Close()
	_, err = conn.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS \"%s\" CASCADE", schemaName))
	return err
}

func ConfigureDbWithPrefix(
	ctx context.Context,
	prefix string,
) (*config.DatabaseConfig, string, func(), error) {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return &config.DatabaseConfig{}, "", func() {}, err
	}
	return ConfigureDbWithSchemaName(ctx, prefix+hex.EncodeToString(b))
}

func ConfigureDbWithSchemaName(
	ctx context.Context,
	dbSchemaName string,
) (*config.DatabaseConfig, string, func(), error) {
	dbUrl := os.Getenv("TEST_DATABASE_URL")
	cfg := config.DatabaseConfig{
		StartupDelay:  2 * time.Millisecond,
		NumPartitions: 4,
	}
	if dbUrl != "" {
		cfg.Url = dbUrl
	} else {
		cfg.Host = "localhost"
		cfg.Port = 5433
		cfg.User = "postgres"
		cfg.Password = "postgres"
		cfg.Database = "river"
		cfg.Extra = "?sslmode=disable&pool_max_conns=1000"
	}
	return &cfg,
		dbSchemaName,
		func() {
			err := DeleteTestSchema(context.Background(), cfg.GetUrl(), dbSchemaName) //nolint:forbidigo  // Still delete even if text context is already cancelled.
			// Force test writers to properly clean up schemas if this fails for some reason.
			if err != nil {
				panic(err)
			}
		},
		nil
}

func ConfigureDB(ctx context.Context) (*config.DatabaseConfig, string, func(), error) {
	dbSchemaName := os.Getenv("TEST_DATABASE_SCHEMA_NAME")
	if dbSchemaName == "" {
		b := make([]byte, 16)
		_, err := rand.Read(b)
		if err != nil {
			return &config.DatabaseConfig{}, "", func() {}, err
		}
		// convert to hex string
		dbSchemaName = "tst" + hex.EncodeToString(b)
	}
	return ConfigureDbWithSchemaName(ctx, dbSchemaName)
}
