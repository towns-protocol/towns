package dbtestutils

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	"github.com/ory/dockertest/v3"
	"github.com/ory/dockertest/v3/docker"
)

func StartDB(ctx context.Context) (string, string, func(), error) {
	dbSchemaName := os.Getenv("TEST_DATABASE_SCHEMA_NAME")
	if dbSchemaName == "" {
		dbSchemaName = "testSchema"
	}
	dbUrl := os.Getenv("TEST_DATABASE_URL")
	if dbUrl != "" {
		return dbUrl, dbSchemaName, func() {}, nil
	}

	// uses a sensible default on windows (tcp/http) and linux/osx (socket)
	pool, err := dockertest.NewPool("")
	if err != nil {
		return dbUrl, dbSchemaName, func() {}, err
	}

	err = pool.Client.Ping()
	if err != nil {
		return dbUrl, dbSchemaName, func() {}, err
	}

	// pulls an image, creates a container based on it and runs it
	resource, err := pool.RunWithOptions(&dockertest.RunOptions{
		Repository: "postgres",
		Tag:        "15",
		Env: []string{
			"POSTGRES_PASSWORD=secret",
			"POSTGRES_USER=user_name",
			"POSTGRES_DB=river",
			"listen_addresses = '*'",
		},
		Cmd: []string{"postgres", "-c", "max_connections=1000"},
	}, func(config *docker.HostConfig) {
		// set AutoRemove to true so that stopped container goes away by itself
		config.AutoRemove = true
		config.RestartPolicy = docker.RestartPolicy{Name: "no"}
	})
	if err != nil {
		log.Fatalf("Could not start resource: %s", err)
		return dbUrl, dbSchemaName, func() {}, err
	}

	hostAndPort := resource.GetHostPort("5432/tcp")
	testDatabaseUrl := fmt.Sprintf("postgres://user_name:secret@%s/river?sslmode=disable", hostAndPort)

	err = resource.Expire(600) // Tell docker to hard kill the container in 120 seconds
	if err != nil {
		return dbUrl, dbSchemaName, func() {}, err
	}

	// exponential backoff-retry, because the application in the container might not be ready to accept connections yet
	pool.MaxWait = 20 * time.Second
	if err = pool.Retry(func() error {
		db, err := sql.Open("postgres", testDatabaseUrl)
		if err != nil {
			return err
		}
		return db.Ping()
	}); err != nil {
		return dbUrl, dbSchemaName, func() {}, err
	}

	return fmt.Sprintf("%s&pool_max_conns=1000", testDatabaseUrl), dbSchemaName, func() {
		// You can't defer this because os.Exit doesn't care for defer
		_ = pool.Purge(resource)
	}, nil
}
