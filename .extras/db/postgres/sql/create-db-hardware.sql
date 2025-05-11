CREATE ROLE hardware LOGIN PASSWORD 'p';

CREATE DATABASE hardware;

GRANT ALL ON DATABASE hardware TO hardware;

CREATE TABLESPACE hardwarespace OWNER hardware LOCATION '/var/lib/postgresql/tablespace/hardware';
