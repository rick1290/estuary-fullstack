CREATE USER estuary WITH PASSWORD 'estuary';
CREATE DATABASE estuary;
GRANT ALL PRIVILEGES ON DATABASE estuary TO estuary;
\connect estuary;
GRANT CREATE ON SCHEMA public TO estuary;