package testutils

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq"
	"github.com/ory/dockertest/v3"
	"github.com/ory/dockertest/v3/docker"
	log "github.com/sirupsen/logrus"
)

func StartDB(ctx context.Context) (string, func(), error) {
	dbUrl := os.Getenv("TEST_DATABASE_URL")
	if dbUrl != "" {
		log.Println("Using env var TEST_DATABASE_URL: ", dbUrl)
		return dbUrl, func() {}, nil
	}

	// uses a sensible default on windows (tcp/http) and linux/osx (socket)
	pool, err := dockertest.NewPool("")
	if err != nil {
		log.Fatalf("Could not construct pool: %s", err)
		return dbUrl, func() {}, err
	}

	err = pool.Client.Ping()
	if err != nil {
		log.Fatalf("Could not connect to Docker: %s", err)
		return dbUrl, func() {}, err
	}

	// pulls an image, creates a container based on it and runs it
	resource, err := pool.RunWithOptions(&dockertest.RunOptions{
		Repository: "postgres",
		Tag:        "15",
		Env: []string{
			"POSTGRES_PASSWORD=secret",
			"POSTGRES_USER=user_name",
			"POSTGRES_DB=casablanca",
			"listen_addresses = '*'",
		},
	}, func(config *docker.HostConfig) {
		// set AutoRemove to true so that stopped container goes away by itself
		config.AutoRemove = true
		config.RestartPolicy = docker.RestartPolicy{Name: "no"}
	})
	if err != nil {
		log.Fatalf("Could not start resource: %s", err)
		return dbUrl, func() {}, err
	}

	hostAndPort := resource.GetHostPort("5432/tcp")
	testDatabaseUrl := fmt.Sprintf("postgres://user_name:secret@%s/casablanca?sslmode=disable", hostAndPort)

	log.Println("Connecting to database on url: ", testDatabaseUrl)

	err = resource.Expire(600) // Tell docker to hard kill the container in 120 seconds
	if err != nil {
		log.Fatalf("Could not set expiration on resource: %s", err)
		return dbUrl, func() {}, err
	}

	// exponential backoff-retry, because the application in the container might not be ready to accept connections yet
	pool.MaxWait = 120 * time.Second
	if err = pool.Retry(func() error {
		db, err := sql.Open("postgres", testDatabaseUrl)
		if err != nil {
			log.Error(err)
			return err
		}
		return db.Ping()
	}); err != nil {
		log.Fatalf("Could not connect to docker: %s", err)
		return dbUrl, func() {}, err
	}

	return testDatabaseUrl, func() {
		// You can't defer this because os.Exit doesn't care for defer
		if err := pool.Purge(resource); err != nil {
			log.Fatalf("Could not purge resource: %s", err)
		}
	}, nil
}
