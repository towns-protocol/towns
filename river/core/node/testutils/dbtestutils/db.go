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

	"github.com/river-build/river/core/config"
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
	dbUrl := os.Getenv("TEST_DATABASE_URL")
	if dbUrl != "" {
		return &config.DatabaseConfig{
			Url:          dbUrl,
			StartupDelay: 2 * time.Millisecond,
		}, dbSchemaName, func() {}, nil
	} else {
		cfg := &config.DatabaseConfig{
			Host:          "localhost",
			Port:          5433,
			User:          "postgres",
			Password:      "postgres",
			Database:      "river",
			Extra:         "?sslmode=disable&pool_max_conns=1000",
			StartupDelay:  2 * time.Millisecond,
			NumPartitions: 4,
		}
		return cfg,
			dbSchemaName,
			func() {
				_ = DeleteTestSchema(ctx, cfg.GetUrl(), dbSchemaName)
			},
			nil
	}
}
