package dbtestutils

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"

	"github.com/jackc/pgx/v5/pgxpool"
)

func GetTestDbUrl() string {
	dbUrl := os.Getenv("TEST_DATABASE_URL")
	if dbUrl != "" {
		return dbUrl
	}
	return "postgres://postgres:postgres@localhost:5433/river?sslmode=disable&pool_max_conns=1000"
}

func DeleteTestSchema(ctx context.Context, dbUrl string, schemaName string) error {
	if os.Getenv("RIVER_TEST_DUMP_DB") != "" {
		cmd := exec.Command("pg_dump", "-Fp", "-d", "postgres://postgres:postgres@localhost:5433/river?sslmode=disable", "-n", schemaName)
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
	if err != nil {
		fmt.Printf("Failed to drop schema: %v", err)
		return err
	}
	return nil
}

func StartDB(ctx context.Context) (string, string, func(), error) {
	dbSchemaName := os.Getenv("TEST_DATABASE_SCHEMA_NAME")
	if dbSchemaName == "" {
		b := make([]byte, 16)
		_, err := rand.Read(b)
		if err != nil {
			return "", "", func() {}, err
		}
		// convert to hex string
		dbSchemaName = "tst" + hex.EncodeToString(b)
	}

	dbUrl := os.Getenv("TEST_DATABASE_URL")
	if dbUrl != "" {
		return dbUrl, dbSchemaName, func() {}, nil
	}
	dbUrl = "postgres://postgres:postgres@localhost:5433/river?sslmode=disable&pool_max_conns=1000"

	schemaDeleter := func() {
		_ = DeleteTestSchema(ctx, dbUrl, dbSchemaName)
	}

	return dbUrl, dbSchemaName, schemaDeleter, nil
}
