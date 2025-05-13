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

/**
 * GraphQL-Resolver for creating, updating, and deleting Hardware data.
 * @see https://docs.nestjs.com/graphql/resolvers#resolvers
 */
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
}
