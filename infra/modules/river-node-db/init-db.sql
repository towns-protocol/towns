-- Log in as master and create a user and database for river

-- First, ssh into any ec2 instance in the subnet
-- Then:
---- psql -h <POSTGRES_HOST> -p 5432 -d postgres -U root -W

-- Replace <RIVER_PASSWORD> with a passwords of your choice
-- Remember that the bastion host needs to be allowed into the database allowed_cidr_blocks.
-- Remember to remove the bastion host from the allowed_cidr_blocks when you're done.

CREATE ROLE river WITH PASSWORD '<RIVER_PASSWORD>' CREATEDB LOGIN;

-- log out as root, and log in as river.

CREATE DATABASE river OWNER river;
