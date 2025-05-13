
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
 * Controller-Klasse zum verwalten von Hardware.
 */
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Hardware REST-API')
export class HardwareGetController {
    readonly #service: HardwareReadService;

    readonly #logger = getLogger(HardwareGetController.name);

    constructor(service: HardwareReadService) {
        this.#service = service;
    }

    /**
     * Search for hardware by its ID as a path parameter.
     * 
     * @param id Path parameter `id`
     * @param req Request object from Express.
     * @param version Version number: If-None-Match in the request header.
     * @param res Empty response object from Express.
     * @returns Empty promise object.
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Search by Hardware ID' })
    @ApiParam({
        name: 'id',
        description: 'e.g., 696-969-696',
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
    * Search for hardware using query parameters.
    *
    * @param query Query parameters from Express.
    * @param req Request object from Express.
    * @param res Empty response object from Express.
    * @returns Empty promise object.
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
