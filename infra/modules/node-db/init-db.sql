-- Log in as master and create a user and database for dendrite

-- First, ssh into any ec2 instance in the subnet
-- Then:
---- psql -h <POSTGRES_HOST> -p 5432 -d postgres -U root -W

-- Replace <DENDRITE_PASSWORD> with a password of your choice

CREATE ROLE dendrite WITH PASSWORD <DENDRITE_PASSWORD> CREATEDB LOGIN;

CREATE DATABASE dendrite OWNER dendrite;