# generate the VAPID keys
./scripts/create-vapid-keys.sh

# create the database
yarn sqlcreate:local

# verify the database is created
# yarn sqlverify:local

# start the worker
yarn dev
