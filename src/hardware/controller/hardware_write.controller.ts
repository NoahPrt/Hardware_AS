/* eslint-disable max-lines */
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
     * Ein neues Buch wird asynchron angelegt. Das neu anzulegende Buch ist als
     * JSON-Datensatz im Request-Objekt enthalten. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit das neu angelegte Buch abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt und genauso auch wenn der Titel oder die ISBN-Nummer bereits
     * existieren.
     *
     * @param buchDTO JSON-Daten für ein Buch im Request-Body.
     * @param req: Request-Objekt von Express für den Location-Header.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
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
     * Ein vorhandenes Buch wird asynchron aktualisiert.
     *
     * Im Request-Objekt von Express muss die ID des zu aktualisierenden Buches
     * als Pfad-Parameter enthalten sein. Außerdem muss im Rumpf das zu
     * aktualisierende Buch als JSON-Datensatz enthalten sein. Damit die
     * Aktualisierung überhaupt durchgeführt werden kann, muss im Header
     * `If-Match` auf die korrekte Version für optimistische Synchronisation
     * gesetzt sein.
     *
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt und genauso auch wenn der neue
     * Titel oder die neue ISBN-Nummer bereits existieren.
     *
     * @param buchDTO Buchdaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
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
     * Ein Buch wird anhand seiner ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @param id Pfad-Paramater für die ID.
     * @returns Leeres Promise-Objekt.
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

        // Rueckwaertsverweis
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
