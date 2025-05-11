// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    Param,
    ParseIntPipe,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Hardware } from '../entity/hardware.entity.js';
import { HardwareReadService } from '../service/hardware_read.service.js';
import { type Suchkriterien } from '../service/suchkriterien.js';
import { createPage } from './page.js';
import { createPageable } from '../service/pageable.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';
import { HardwareType } from '../entity/hardware.entity.js';

/**
 * Klasse für `HardwareGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren.
 */
export class HardwareQuery implements Suchkriterien {
    @ApiProperty({ required: false })
    declare readonly name?: string;

    @ApiProperty({ required: false })
    declare readonly type?: HardwareType;

    @ApiProperty({ required: false })
    declare readonly manufacturer?: string;

    @ApiProperty({ required: false })
    declare readonly price?: number;

    @ApiProperty({ required: false })
    declare readonly rating?: number;

    @ApiProperty({ required: false })
    declare readonly InStock?: boolean;

    @ApiProperty({ required: false })
    declare size?: string;

    @ApiProperty({ required: false })
    declare page?: string;
}

/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
// Decorator in TypeScript, zur Standardisierung in ES vorgeschlagen (stage 3)
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#decorators
// https://github.com/tc39/proposal-decorators
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Hardware REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class HardwareGetController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: HardwareReadService;

    readonly #logger = getLogger(HardwareGetController.name);

    // Dependency Injection (DI) bzw. Constructor Injection
    // constructor(private readonly service: hardwareReadService) {}
    // https://github.com/tc39/proposal-type-annotations#omitted-typescript-specific-features-that-generate-code
    constructor(service: HardwareReadService) {
        this.#service = service;
    }

    /**
     * Ein hardware wird asynchron anhand seiner ID als Pfadparameter gesucht.
     * 
     * @param id Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Search by Hardware ID' })
    @ApiParam({
        name: 'id',
        description: 'e.g., 123-123-123',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header for conditional GET requests, e.g., "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'The hardware was found' })
    @ApiNotFoundResponse({ description: 'No hardware found for the given ID' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'The hardware has already been downloaded',
    })
    async getById(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<Hardware | undefined>> {
        this.#logger.debug('getById: id=%s, version=%s', id, version);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const hardware = await this.#service.findById({ id });
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('getById(): hardware=%s', hardware.toString());
        }

        // ETags
        const versionDb = hardware.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        this.#logger.debug('getById: hardware=%o', hardware);
        return res.json(hardware);
    }

    /**
     * Bücher werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches hardware gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Büchern, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein hardware zu den Suchkriterien gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle Bücher ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Search with criteria' })
    @ApiOkResponse({ description: 'A potentially empty list of hardware' })
    async get(
        @Query() query: HardwareQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<Hardware[] | undefined>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const { page, size } = query;
        delete query['page'];
        delete query['size'];
        this.#logger.debug('get: page=%s, size=%s', page, size);

        const keys = Object.keys(query) as (keyof HardwareQuery)[];
        keys.forEach((key) => {
            if (query[key] === undefined) {
                delete query[key];
            }
        });
        this.#logger.debug('get: query=%o', query);

        const pageable = createPageable({ number: page, size });
        const hardwareSlice = await this.#service.find(query, pageable);
        const hardwarePage = createPage(hardwareSlice, pageable);
        this.#logger.debug('get: hardwarePage=%o', hardwarePage);

        return res.json(hardwarePage).send();
    }
}
