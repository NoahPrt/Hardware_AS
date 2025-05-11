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

// eslint-disable-next-line max-classes-per-file
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import Decimal from 'decimal.js'; // eslint-disable-line @typescript-eslint/naming-convention
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Abbildung } from '../entity/abbildung.entity.js';
import { type IdInput } from './hardware_query.resolver.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { HardwareDTO } from '../controller/hardwareDTO.entity.js';
import { HardwareWriteService } from '../service/hardware_write.service.js';
import { Hardware } from '../entity/hardware.entity.js';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export type CreatePayload = {
    readonly id: number;
};

export type UpdatePayload = {
    readonly version: number;
};

export class HardwareUpdateDTO extends HardwareDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver('Hardware')
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class HardwareMutationResolver {
    readonly #service: HardwareWriteService;

    readonly #logger = getLogger(HardwareMutationResolver.name);

    constructor(service: HardwareWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async create(@Args('input') hardwareDTO: HardwareDTO) {
        this.#logger.debug('create: hardwareDTO=%o', hardwareDTO);

        const hardware = this.#hardwareDtoToHardware(hardwareDTO);
        const id = await this.#service.create(hardware);
        this.#logger.debug('createHardware: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async update(@Args('input') hardwareDTO: HardwareUpdateDTO) {
        this.#logger.debug('update: hardware=%o', hardwareDTO);

        const hardware = this.#hardwareUpdateDtoToHardware(hardwareDTO);
        const versionStr = `"${hardwareDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(hardwareDTO.id, 10),
            hardware,
            version: versionStr,
        });
        // TODO BadUserInputError
        this.#logger.debug('updateHardware: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin'] })
    async delete(@Args() id: IdInput) {
        const idStr = id.id;
        this.#logger.debug('delete: id=%s', idStr);
        const deletePerformed = await this.#service.delete(idStr);
        this.#logger.debug('deleteHardware: deletePerformed=%s', deletePerformed);
        return deletePerformed;
    }

    #hardwareDtoToHardware(hardwareDTO: HardwareDTO): Hardware {
        // "Optional Chaining" ab ES2020
        const abbildungen = hardwareDTO.abbildungen?.map((abbildungDTO) => {
            const abbildung: Abbildung = {
                id: undefined,
                beschriftung: abbildungDTO.beschriftung,
                contentType: abbildungDTO.contentType,
                hardware: undefined,
            };
            return abbildung;
        });
        const hardware: Hardware = {
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
        return hardware;
    }

    #hardwareUpdateDtoToHardware(hardwareDTO: HardwareUpdateDTO): Hardware {
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

    // #errorMsgCreateBuch(err: CreateError) {
    //     switch (err.type) {
    //         case 'IsbnExists': {
    //             return `Die ISBN ${err.isbn} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdateBuch(err: UpdateError) {
    //     switch (err.type) {
    //         case 'BuchNotExists': {
    //             return `Es gibt kein Buch mit der ID ${err.id}`;
    //         }
    //         case 'VersionInvalid': {
    //             return `"${err.version}" ist keine gueltige Versionsnummer`;
    //         }
    //         case 'VersionOutdated': {
    //             return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }
}
