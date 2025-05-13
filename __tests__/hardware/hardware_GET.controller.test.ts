import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { Decimal } from 'decimal.js';
import { type Hardware } from '../../src/hardware/entity/hardware.entity.js';
import { type Page } from '../../src/hardware/controller/page.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type ErrorResponse } from './error-response.js';

const ratingMin = 3;
const preisMax = 700;
const schlagwortNichtVorhanden = 'JoeMama';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GET /rest', () => {
    let baseURL: string;
    let client: AxiosInstance;

    beforeAll(async () => {
        await startServer();
        baseURL = `https://${host}:${port}/rest`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: () => true,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Every Hardware in DB', async () => {
        // given

        // when
        const { status, headers, data }: AxiosResponse<Page<Hardware>> =
            await client.get('/');

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();

        data.content
            .map((hardware) => hardware.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });

    test('Hardware with rating higher than ...', async () => {
        // given
        const params = { rating: ratingMin };

        // when
        const { status, headers, data }: AxiosResponse<Page<Hardware>> =
            await client.get('/', { params });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();

        data.content
            .map((hardware) => hardware.rating)
            .forEach((rating) =>
                expect(rating).toBeGreaterThanOrEqual(ratingMin),
            );
    });

    test('Hardware below certain price', async () => {
        // given
        const params = { price: preisMax };

        // when
        const { status, headers, data }: AxiosResponse<Page<Hardware>> =
            await client.get('/', { params });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();

        data.content
            .map((hardware) => Decimal(hardware.price))
            .forEach((price) =>
                expect(price.lessThanOrEqualTo(Decimal(preisMax))).toBeTruthy(),
            );
    });

    test('No Hardware due to non existent tag', async () => {
        // given
        const params = { [schlagwortNichtVorhanden]: 'true' };

        // when
        const { status, data }: AxiosResponse<ErrorResponse> = await client.get(
            '/',
            { params },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);

        const { error, statusCode } = data;

        expect(error).toBe('Not Found');
        expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    test('No Hardware due to non existent Property', async () => {
        // given
        const params = { foo: 'bar' };

        // when
        const { status, data }: AxiosResponse<ErrorResponse> = await client.get(
            '/',
            { params },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);

        const { error, statusCode } = data;

        expect(error).toBe('Not Found');
        expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    });
});
