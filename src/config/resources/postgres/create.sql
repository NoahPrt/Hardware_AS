CREATE SCHEMA IF NOT EXISTS AUTHORIZATION hardware;

ALTER ROLE hardware SET search_path = 'hardware';

CREATE TYPE hardwaretype AS ENUM ('GRAPHICS_CARD', 'PROCESSOR', 'MOTHERBOARD', 'RAM', 'SSD', 'HDD', 'POWER_SUPPLY', 'CASE', 'COOLER', 'FAN');

CREATE TABLE IF NOT EXISTS hardware (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1) PRIMARY KEY USING INDEX TABLESPACE hardwarespace,
    version       integer NOT NULL DEFAULT 0,
    name          text NOT NULL UNIQUE USING INDEX TABLESPACE hardwarespace,
    type          hardwaretype,
    manufacturer  text,
    price         decimal(8,2) NOT NULL,
    rating        integer NOT NULL CHECK (rating >= 0 AND rating <= 5),
    in_stock      boolean NOT NULL DEFAULT FALSE,
    tags          text,
    created       timestamp NOT NULL DEFAULT NOW(),
    updated       timestamp NOT NULL DEFAULT NOW()
) TABLESPACE hardwarespace;

CREATE TABLE IF NOT EXISTS abbildung (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE hardwarespace,
    beschriftung    text NOT NULL,
    content_type    text NOT NULL,
    hardware_id     integer NOT NULL REFERENCES hardware
) TABLESPACE hardwarespace;
CREATE INDEX IF NOT EXISTS abbildung_hardware_id_idx ON abbildung(hardware_id) TABLESPACE hardwarespace;