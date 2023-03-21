-- Log in as master and create a user and database for dendrite

-- First, ssh into any ec2 instance in the subnet
-- Then:
---- psql -h <POSTGRES_HOST> -p 5432 -d postgres -U root -W

-- Replace <DENDRITE_PASSWORD> and <DENDRITE_READONLY_PASSWORD> with passwords of your choice
-- Remember that the bastion host needs to be allowed into the database allowed_cidr_blocks.
-- Remember to remove the bastion host from the allowed_cidr_blocks when you're done.

CREATE ROLE dendrite WITH PASSWORD 'I3fkLwmrAKLnfDAkQ7IEVRzLbNN3kWU1' CREATEDB LOGIN;

CREATE ROLE dendrite_readonly WITH PASSWORD 'fHTdyRq6mdIBritBUHMdFBKOoO4YraxI' LOGIN;

-- log out as root, and log in as dendrite.

CREATE DATABASE dendrite OWNER dendrite;

-- log out as dendrite, log back in as root.

-- allow readonly access on the dendrite database to the dendrite_readonly user
GRANT CONNECT ON DATABASE dendrite TO dendrite_readonly;
GRANT USAGE ON SCHEMA public TO dendrite_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dendrite_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO dendrite_readonly;
