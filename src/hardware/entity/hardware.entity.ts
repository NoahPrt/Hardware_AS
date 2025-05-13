import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { DecimalTransformer } from './decimal-transformer.js';
import { Abbildung } from './abbildung.entity.js';
import { dbType } from '../../config/db.js';
import Decimal from 'decimal.js';
import { ApiProperty } from '@nestjs/swagger';

export type HardwareType = 'GRAPHICS_CARD' | 'PROCESSOR' | 'MOTHERBOARD' | 'RAM' | 'SSD' | 'HDD' | 'POWER_SUPPLY' | 'CASE' | 'COOLER' | 'FAN';

/**
 * Entity class for Hardware.
 *
 * @property {number} id - Unique ID of the hardware.
 * @property {number} version - Version of the hardware.
 * @property {string} name - Name of the hardware.
 * @property {HardwareType} type - Type of the hardware.
 * @property {string} manufacturer - Manufacturer of the hardware.
 * @property {Decimal} price - Price of the hardware.
 * @property {number} rating - Rating of the hardware (1-5).
 * @property {boolean} inStock - Availability of the hardware.
 * @property {string[]} tags - Tags for categorizing the hardware.
 * @property {Abbildung[]} abbildungen - Images of the hardware.
 * @property {Date} created - Creation date of the hardware.
 * @property {Date} updated - Last modification date of the hardware.
 */
@Entity()
export class Hardware {

    @PrimaryGeneratedColumn()
    readonly id: number | undefined;

    @VersionColumn()
    readonly version: number | undefined;

    @Column('text')
    name!: string;

    @Column('varchar')
    readonly type: HardwareType | undefined;

    @Column('text')
    readonly manufacturer!: string;

    @Column('decimal', { precision: 10, scale: 2, transformer: new DecimalTransformer() })
    readonly price!: Decimal;

    @Column('int')
    readonly rating: number | undefined;

    @Column('decimal')
    @ApiProperty({example: true, type: 'boolean'})
    readonly inStock: boolean | undefined;

    @Column('simple-array')
    tags: string[] | null | undefined;

    @OneToMany(() => Abbildung, (abbildung) => abbildung.hardware, {
        cascade: ['insert', 'remove'],
    })
    readonly abbildungen: Abbildung[] | undefined;

    @CreateDateColumn({
        type: dbType === 'sqlite' ? 'datetime' : 'timestamp',
    })
    readonly created: Date | undefined;

    @UpdateDateColumn({
        type: dbType === 'sqlite' ? 'datetime' : 'timestamp',
    })
    readonly updated: Date | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            name: this.name,
            type: this.type,
            manufacturer: this.manufacturer,
            price: this.price,
            rating: this.rating,
            inStock: this.inStock,
            tags: this.tags,
            created: this.created,
            updated: this.updated,
        });
}
