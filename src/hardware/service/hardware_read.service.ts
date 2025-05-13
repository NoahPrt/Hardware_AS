import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder } from './query-builder.js';
import { getLogger } from '../../logger/logger.js';
import { Hardware } from '../entity/hardware.entity.js';
import { Pageable } from './pageable.js';
import { Slice } from './slice.js';
import { Suchkriterien } from './suchkriterien.js';

export type FindByIdParams = { 
    readonly id: number;
    readonly mitAbbildungen?: boolean;
}

@Injectable()
export class HardwareReadService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #hardwareProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #logger = getLogger(HardwareReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const hardwareDummy = new Hardware();
        this.#hardwareProps = Object.getOwnPropertyNames(hardwareDummy);
        this.#queryBuilder = queryBuilder;
    }

    /**
     * Find hardware by ID provided in the params.
     * @param id ID of Hardware
     * @param mitAbbildungen true, if Abbildungen are also to be fetched
     * @returns Found Hardware
     * @throws NotFoundException, if no Hardware with the given ID is found
     */
    async findById({id, mitAbbildungen = false}:FindByIdParams ): Promise<Readonly<Hardware>> {
        
        this.#logger.debug('findById: id=%d', id);

        const hardware = await this.#queryBuilder
            .buildId({id, mitAbbildungen})
            .getOne();

        if(hardware === null) {
            this.#logger.debug('findById: id=%d not found', id);
            throw new NotFoundException(`Hardware mit ID ${id} nicht gefunden`,);
        }

        if(hardware.tags === null) {
            hardware.tags = [];
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: hardware=%s',
                hardware.toString(),
            );
            if (mitAbbildungen) {
                this.#logger.debug(
                    'findById: abbildungen=%o',
                    hardware.abbildungen,
                );
            }
        }
        return hardware;
    }

    async find(suchkriterien: Suchkriterien | undefined, pageable: Pageable): Promise<Slice<Hardware>> {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);
        this.#logger.debug('find: pageable=%o', pageable);

        if(suchkriterien === undefined) {
            return await this.#findAll(pageable);
        }

        const keys = Object.keys(suchkriterien);
        if(keys.length === 0) {
            return await this.#findAll(pageable);
        }

        if(!this.#checkKeys(keys) || !this.#checkEnums(suchkriterien)) {
            throw new NotFoundException(`Ungueltige Suchkriterien`);
        }

        const queryBuilder = this.#queryBuilder.build(suchkriterien, pageable);
        const hardware = await queryBuilder.getMany();
        if (hardware.length === 0) {
            this.#logger.debug('find: Keine Hardware gefunden');
            throw new NotFoundException(
                `Keine Hardware gefunden: ${JSON.stringify(suchkriterien)}, Seite ${pageable.number}}`,
            );
        }
        const totalElements = await queryBuilder.getCount();
        return this.#createSlice(hardware, totalElements);
    }

    async #findAll(pageable: Pageable) {
        const queryBuilder = this.#queryBuilder.build({}, pageable);
        const hardware = await queryBuilder.getMany();
        if (hardware.length === 0) {
            throw new NotFoundException(`Ungueltige Seite "${pageable.number}"`);
        }
        const totalElements = await queryBuilder.getCount();
        return this.#createSlice(hardware, totalElements);
    }

    #createSlice(hardware: Hardware[], totalElements: number) {
        hardware.forEach((hardware) => {
            if (hardware.tags === null) {
                hardware.tags = [];
            }
        });
        const hardwareSlice: Slice<Hardware> = {
            content: hardware,
            totalElements,
        };
        this.#logger.debug('createSlice: HardwareSlice=%o', hardwareSlice);
        return hardwareSlice;
    }

    #checkKeys(keys: string[]) {
        this.#logger.debug('#checkKeys: keys=%s', keys);
        // Ist jedes Suchkriterium auch eine Property von Buch oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (!this.#hardwareProps.includes(key)&&
            key !== 'DDR4' &&
            key !== 'gaming' &&
            key !== 'high-speed' &&
            key !== 'reliable') {
                this.#logger.debug(
                    '#checkKeys: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });
        return validKeys;
    }

    #checkEnums(suchkriterien: Suchkriterien) {
        const { type } = suchkriterien;
        this.#logger.debug('#checkEnums: Suchkriterium "type=%s"', type);
        return (
            type === undefined ||
            type === 'GRAPHICS_CARD' ||
            type === 'PROCESSOR' ||
            type === 'MOTHERBOARD' ||
            type === 'RAM' ||
            type === 'SSD' ||
            type === 'HDD' ||
            type === 'POWER_SUPPLY' ||
            type === 'CASE' ||
            type === 'COOLER' ||
            type === 'FAN'
        );
    }
}