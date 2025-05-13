import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Hardware } from './hardware.entity.js';

@Entity()
export class Abbildung {
    
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column()
    readonly beschriftung!: string;

    @Column('varchar')
    readonly contentType: string | undefined;

    @ManyToOne(() => Hardware, (hardware) => hardware.abbildungen)
    @JoinColumn({ name: 'hardware_id' })
    hardware: Hardware | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            beschriftung: this.beschriftung,
            contentType: this.contentType,
        });
}
