import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { DecimalTransformer } from './decimal-transformer.js';
import { Abbildung } from './abbildung.entity.js';
import { dbType } from '../../config/db.js';
import Decimal from 'decimal.js';
import { ApiProperty } from '@nestjs/swagger';

export type HardwareType = 'GRAPHICS_CARD' | 'PROCESSOR' | 'MOTHERBOARD' | 'RAM' | 'SSD' | 'HDD' | 'POWER_SUPPLY' | 'CASE' | 'COOLER' | 'FAN';

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
