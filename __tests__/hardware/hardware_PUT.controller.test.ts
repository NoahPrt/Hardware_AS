/* eslint-disable @typescript-eslint/no-magic-numbers */
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { tokenRest } from '../token.js';
// eslint-disable-next-line import/no-internal-modules
import { type HardwareDtoWithoutRefs } from '../../src/hardware/controller/hardwareDTO.entity';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const updatedHardware: Omit<HardwareDtoWithoutRefs, 'price'> & {
    price: number;
} = {
    name: 'RTX 3080',
    manufacturer: 'NVIDIA',
    rating: 5,
    type: 'GRAPHICS_CARD',
    price: 879.99,
    inStock: true,
    tags: ['GPU'],
};
const idExistent = '1000';

const updatedHardwareNonExistent: Omit<HardwareDtoWithoutRefs, 'price'> & {
    price: number;
} = {
    name: 'BINGOBONGO',
    manufacturer: 'BINGOBONGO',
    rating: 4,
    type: 'RAM',
    price: 44.4,
    inStock: true,
    tags: ['DDR4'],
};
const idNonExistent = '69696969';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('PUT /rest/:id', () => {
    let client: AxiosInstance;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json', // eslint-disable-line @typescript-eslint/naming-convention
    };

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}`;
        client = axios.create({
            baseURL,
            headers,
            httpsAgent,
            validateStatus: (status) => status < 500,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Update existent hardware', async () => {
        // given
        const url = `/rest/${idExistent}`;
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"1"';

        // when
        const { status, data }: AxiosResponse<string> = await client.put(
            url,
            updatedHardware,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
        expect(data).toBe('');
    });

    test('Update non-existent hardware', async () => {
        // given
        const url = `/rest/${idNonExistent}`;
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const { status }: AxiosResponse<string> = await client.put(
            url,
            updatedHardwareNonExistent,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });
});
/* eslint-enable @typescript-eslint/no-magic-numbers */
