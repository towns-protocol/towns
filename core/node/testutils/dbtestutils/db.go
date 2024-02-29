package dbtestutils

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

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
		conn, err := pgxpool.New(ctx, dbUrl)
		if err != nil {
			fmt.Printf("Failed to connect to database to delete schema: %v\n", err)
			return
		}
		defer conn.Close()
		_, err = conn.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS \"%s\" CASCADE", dbSchemaName))
		if err != nil {
			fmt.Printf("Failed to delete schema: %s %v\n", dbSchemaName, err)
		}
	}

	return dbUrl, dbSchemaName, schemaDeleter, nil
}
