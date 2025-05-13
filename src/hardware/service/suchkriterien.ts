/**
 * This Module consists of the class {@linkcode Suchkriterien}.
 * @packageDocumentation
 */

import { HardwareType } from '../entity/hardware.entity.js';

/**
 * Type-Definition for `find` in `hardware_read.service` and `QueryBuilder.build()`.
 */
export interface Suchkriterien {
    readonly name?: string;
    readonly rating?: number;
    readonly inStock?: boolean;
    readonly type?: HardwareType;
    readonly manufacturer?: string;
    readonly price?: number;
}
