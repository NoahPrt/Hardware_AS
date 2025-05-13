/* eslint-disable max-lines */
/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import Decimal from 'decimal.js'; // eslint-disable-line @typescript-eslint/naming-convention
import { Request, Response } from 'express';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Abbildung } from '../entity/abbildung.entity.js';
import { HardwareDTO, HardwareDtoWithoutRefs } from './hardwareDTO.entity.js';
import { createBaseUri } from './createBaseUri.js';
import { Hardware } from '../entity/hardware.entity.js';
import { HardwareWriteService } from '../service/hardware_write.service.js';

const MSG_FORBIDDEN = 'No token with sufficient permissions available';
/**
 * Controller class for managing hardware.
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Hardware REST-API')
@ApiBearerAuth()
export class HardwareWriteController {
    readonly #service: HardwareWriteService;

    readonly #logger = getLogger(HardwareWriteController.name);

    constructor(service: HardwareWriteService) {
        this.#service = service;
    }

    /**
     * Create a new hardware entry. Transmitted using JSON data in the request body.
     *
     * @param hardwareDTO JSON data for hardware in the request body.
     * @param req Request object from Express for the Location header.
     * @param res Empty response object from Express.
     * @returns Empty Promise object.
     */
    @Post()
    @Roles({ roles: ['admin', 'user'] })
    @ApiOperation({ summary: 'Create new hardware' })
    @ApiCreatedResponse({ description: 'Successfully created' })
    @ApiBadRequestResponse({ description: 'Invalid hardware data' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() hardwareDTO: HardwareDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: hardwareDTO=%o', hardwareDTO);

        const hardware = this.#hardwareDtoToHardware(hardwareDTO);
        const id = await this.#service.create(hardware);

        const location = `${createBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * An existing hardware entry is updated asynchronously.
     *
     * @param hardwareDTO Hardware data in the body of the request object.
     * @param id Path parameter for the ID.
     * @param version Version number from the If-Match header.
     * @param res Empty response object from Express.
     * @returns Empty Promise object.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @Roles({ roles: ['admin', 'user'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update an existing hardware' })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header for optimistic synchronization',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Successfully updated' })
    @ApiBadRequestResponse({ description: 'Invalid hardware data' })
    @ApiPreconditionFailedResponse({
        description: 'Incorrect version in the "If-Match" header',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: '"If-Match" header is missing',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() hardwareDTO: HardwareDtoWithoutRefs,
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%s, hardwareDTO=%o, version=%s',
            id,
            hardwareDTO,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" missing';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const hardware = this.#hardwareDtoOhneRefToHardware(hardwareDTO);
        const newVersion = await this.#service.update({ id, hardware, version });
        this.#logger.debug('put: version=%d', newVersion);
        return res.header('ETag', `"${newVersion}"`).send();
    }

    /**
     * A hardware entry is deleted based on its ID, which is specified as a path parameter.
     * The returned status code is `204` (`No Content`).
     *
     * @param id Path parameter for the ID.
     * @returns Empty Promise object.
     */
    @Delete(':id')
    @Roles({ roles: ['admin'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete hardware with the given ID' })
    @ApiNoContentResponse({
        description: 'The hardware was deleted or did not exist',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%s', id);
        await this.#service.delete(id);
    }

    #hardwareDtoToHardware(hardwareDTO: HardwareDTO): Hardware {
        const abbildungen = hardwareDTO.abbildungen?.map((abbildungDTO) => {
            const abbildung: Abbildung = {
                id: undefined,
                beschriftung: abbildungDTO.beschriftung,
                contentType: abbildungDTO.contentType,
                hardware: undefined,
            };
            return abbildung;
        });
        const hardware = {
            id: undefined,
            version: undefined,
            name: hardwareDTO.name,
            manufacturer: hardwareDTO.manufacturer,
            rating: hardwareDTO.rating,
            type: hardwareDTO.type,
            price: Decimal(hardwareDTO.price),
            inStock: hardwareDTO.inStock,
            tags: hardwareDTO.tags,
            abbildungen,
            created: new Date(),
            updated: new Date(),
        };

        hardware.abbildungen?.forEach((abbildung) => {
            abbildung.hardware = hardware;
        });
        return hardware;
    }

    #hardwareDtoOhneRefToHardware(hardwareDTO: HardwareDtoWithoutRefs): Hardware {
        return {
            id: undefined,
            version: undefined,
            name: hardwareDTO.name,
            manufacturer: hardwareDTO.manufacturer,
            rating: hardwareDTO.rating,
            type: hardwareDTO.type,
            price: Decimal(hardwareDTO.price),
            inStock: hardwareDTO.inStock,
            tags: hardwareDTO.tags,
            abbildungen: undefined,
            created: new Date(),
            updated: new Date(),
        };
    }
}
/* eslint-enable max-lines */
