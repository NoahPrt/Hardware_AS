import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { createPageable } from '../service/pageable.js';
import { type Suchkriterien } from '../service/suchkriterien.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { HardwareReadService } from '../service/hardware_read.service.js';

export type IdInput = {
    readonly id: number;
};

export type SuchkriterienInput = {
    readonly suchkriterien: Suchkriterien;
};

/**
 * GraphQL-Resolver for fetching Hardware data.
 * @see https://docs.nestjs.com/graphql/quick-start
 */
@Resolver('Hardware')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class HardwareQueryResolver {
    readonly #service: HardwareReadService;

    readonly #logger = getLogger(HardwareQueryResolver.name);

    constructor(service: HardwareReadService) {
        this.#service = service;
    }

    @Query('hardware')
    @Public()
    async findById(@Args() { id }: IdInput) {
        this.#logger.debug('findById: id=%d', id);

        const hardware = await this.#service.findById({ id });

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: hardware=%s',
                hardware.toString()
            );
        }
        return hardware;
    }

    @Query('hardwareMult')
    @Public()
    async find(@Args() input: SuchkriterienInput | undefined) {
        this.#logger.debug('find: input=%o', input);
        const pageable = createPageable({});
        const hardwareSlice = await this.#service.find(
            input?.suchkriterien,
            pageable,
        );
        this.#logger.debug('find: hardwareSlice=%o', hardwareSlice);
        return hardwareSlice.content;
    }
}
