-- Log in as master and create a user and database for dendrite

-- First, ssh into any ec2 instance in the subnet
-- Then:
---- psql -h <POSTGRES_HOST> -p 5432 -d postgres -U root -W

-- Replace <DENDRITE_PASSWORD> with a password of your choice

CREATE ROLE dendrite WITH PASSWORD <DENDRITE_PASSWORD> CREATEDB LOGIN;

CREATE ROLE dendrite_readonly WITH PASSWORD <DENDRITE_PASSWORD> LOGIN;

CREATE DATABASE dendrite OWNER dendrite;

-- allow readonly access on the dendrite database to the dendrite_readonly user
GRANT CONNECT ON DATABASE dendrite TO dendrite_readonly;
GRANT USAGE ON SCHEMA public TO dendrite_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dendrite_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO dendrite_readonly;
