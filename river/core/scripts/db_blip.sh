# To test node resiliency in the event of intermittent network outages between
# the node and the database, do the following:
#
# 1. Update the docker-compose.yaml exposed port for postgres from 5433 to
# another port, such as 6433
#
# 2. Run a toxiproxy docker container on the same network as the postgres
#    instance, like so:
#
#    docker run -d --name toxiproxy \
#        --network river_default \
#        -p 8474:8474 \
#        -p 5433:5433 \
#        ghcr.io/shopify/toxiproxy:2.5.0
#
# 3. Create the toxiproxy proxy for postgres
#
#   brew install shopify/shopify/toxiproxy
#
#   toxiproxy-cli -h localhost:8474 create --listen 0.0.0.0:5433 \
#       --upstream river-postgres-1:5432 postgres
# 
# 4. Restart any local dev and confirm proxy is functioning with unit tests.
#
# Note: to interact with the db while traffic is interrupted through another
#    tool such as pgadmin, be sure to reconfigure your pgadmin connection
#    to use port 6433, or whatever port you used in step 1.
#
# 5. Add and remove toxiproxy rules, which are called toxics, or run the commands
#    below to simulate a temporary network outage of 10s.


# Break all connections. New connections will timeout after 100ms.
toxiproxy-cli -h localhost:8474 toxic add -t timeout -a timeout=100 postgres

# Wait for your desired duration
sleep 10

# Remove the toxic to restore connections
toxiproxy-cli -h localhost:8474 toxic remove -toxicName timeout_downstream postgres
