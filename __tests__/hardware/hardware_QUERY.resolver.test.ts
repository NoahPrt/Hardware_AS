/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type GraphQLRequest } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type Hardware } from '../../src/hardware/entity/hardware.entity.js';
import { type GraphQLResponseBody } from '../graphql.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';

type HardwareDTO = Omit<Hardware, 'abbildungen' | 'aktualisiert' | 'erzeugt'>;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idExistent = '1000';

const nameExistent = 'RTX 3080';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Queries', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: () => true,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Hardware with certain ID', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    hardware(id: "${idExistent}") {
                        version
                        name
                        manufacturer
                        rating
                        type
                        price
                        inStock
                        tags
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { hardware } = data.data! as { hardware: HardwareDTO };

        expect(hardware.version).toBeGreaterThan(-1);
        expect(hardware.id).toBeUndefined();
    });

    test('Hardware but ID does not exist', async () => {
        // given
        const id = '696969';
        const body: GraphQLRequest = {
            query: `
                {
                    hardware(id: "${id}") {
                        manufacturer
                        name
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.hardware).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toBe(`Hardware mit ID ${id} nicht gefunden`);
        expect(path).toBeDefined();
        expect(path![0]).toBe('hardware');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Hardware with existent name', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    hardwareMult(suchkriterien: {
                        name: "${nameExistent}"
                    }) {
                        name
                        manufacturer
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { hardwareMult } = data.data! as { hardwareMult: HardwareDTO[] };

        expect(hardwareMult).not.toHaveLength(0);
        expect(hardwareMult).toHaveLength(1);

        const [hardware] = hardwareMult;
        const { name, manufacturer } = hardware!;

        expect(name).toBe(nameExistent);
        expect(manufacturer).toBeDefined();
    });
});

/* eslint-enable @typescript-eslint/no-non-null-assertion */
