/**
 * Module consists of the class {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getLogger } from '../../logger/logger.js';
import { Abbildung } from '../entity/abbildung.entity.js';
import { Hardware } from '../entity/hardware.entity.js';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from './pageable.js';
import { type Pageable } from './pageable.js';
import { type Suchkriterien } from './suchkriterien.js';

/** Type definitions for searching with the hardware ID. */
export type BuildIdParams = {
    /** ID of the hardware being searched for. */
    readonly id: number;
    /** Should the images be loaded as well? */
    readonly mitAbbildungen?: boolean;
};
/**
 * The `QueryBuilder` class implements reading for hardware and accesses
 * a relational database using _TypeORM_.
 */
@Injectable()
export class QueryBuilder {
    readonly #hardwareAlias = `${Hardware.name
        .charAt(0)
        .toLowerCase()}${Hardware.name.slice(1)}`;

    readonly #abbildungAlias = `${Abbildung.name
        .charAt(0)
        .toLowerCase()}${Abbildung.name.slice(1)}`;

    readonly #repo: Repository<Hardware>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Hardware) repo: Repository<Hardware>) {
        this.#repo = repo;
    }

    /**
     * Search for hardware by its ID.
     * @param id ID of the hardware being searched for
     * @returns QueryBuilder
     */
    buildId({ id, mitAbbildungen = false }: BuildIdParams) {
        const queryBuilder = this.#repo.createQueryBuilder(this.#hardwareAlias);

        if (mitAbbildungen) {
            queryBuilder.leftJoinAndSelect(
                `${this.#hardwareAlias}.abbildungen`,
                this.#abbildungAlias,
            );
        }

        queryBuilder.where(`${this.#hardwareAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Search for hardware asynchronously.
     * @param suchkriterien JSON object with search criteria. For "rating", a minimum value is used, and for "price",
     * an upper limit is applied.
     * @param pageable Maximum number of records and page number.
     * @returns QueryBuilder
     */
    // eslint-disable-next-line max-lines-per-function, prettier/prettier, sonarjs/cognitive-complexity
    build(
        {
            // NOSONAR
            name,
            price,
            rating,
            ...restProps
        }: Suchkriterien,
        pageable: Pageable,
    ) {
        this.#logger.debug(
            'build: name=%s, price=%s, rating=%s, restProps=%o, pageable=%o',
            name,
            price,
            rating,
            restProps,
            pageable,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#hardwareAlias);

        let useWhere = true;

        if (name !== undefined && typeof name === 'string') {
            queryBuilder = queryBuilder.where(
                `${this.#hardwareAlias}.name ilike :name`,
                { name: `%${name}%` },
            );
            useWhere = false;
        }

        if (rating !== undefined) {
            const ratingNumber =
                typeof rating === 'string' ? parseInt(rating) : rating;
            if (!isNaN(ratingNumber)) {
                queryBuilder = queryBuilder.where(
                    `${this.#hardwareAlias}.rating >= ${ratingNumber}`,
                );
                useWhere = false;
            }
        }

        if (price !== undefined && typeof price === 'string') {
            const preisNumber = Number(price);
            queryBuilder = queryBuilder.where(
                `${this.#hardwareAlias}.price <= ${preisNumber}`,
            );
            useWhere = false;
        }

        Object.entries(restProps).forEach(([key, value]) => {
            const param: Record<string, any> = {};
            param[key] = value; // eslint-disable-line security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#hardwareAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#hardwareAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());

        if (pageable?.size === 0) {
            return queryBuilder;
        }
        const size = pageable?.size ?? DEFAULT_PAGE_SIZE;
        const number = pageable?.number ?? DEFAULT_PAGE_NUMBER;
        const skip = number * size;
        this.#logger.debug('take=%s, skip=%s', size, skip);
        return queryBuilder.take(size).skip(skip);
    }
}
