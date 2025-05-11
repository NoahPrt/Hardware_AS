import { NotFoundException, Injectable } from "@nestjs/common";
import { Hardware } from "../entity/hardware.entity.js";
import { getLogger } from "../../logger/logger.js";
import { HardwareReadService } from "./hardware_read.service.js";
import { DeleteResult, Repository } from "typeorm";
import { MailService } from "../../mail/mail.service.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Abbildung } from "../entity/abbildung.entity.js";
import { HardwareNameExistsException, VersionInvalidException, VersionOutdatedException } from "./exceptions.js";

export type UpdateParams = {
    readonly id: number | undefined;
    readonly hardware: Hardware;
    readonly version: string;
}

@Injectable()
export class HardwareWriteService {

    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #repo: Repository<Hardware>;

    readonly #readService: HardwareReadService;

    readonly #mailService: MailService;
    
    readonly #logger = getLogger(HardwareWriteService.name);

    constructor(
        @InjectRepository(Hardware) repo: Repository<Hardware>,
        readService: HardwareReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    async create(hardware: Hardware) {

        this.#logger.debug('create: hardware=%o', hardware);

        await this.#validateCreate(hardware);

        const hardwareDb = await this.#repo.save(hardware); // implizite Transaktion
        await this.#sendmail(hardwareDb);

        return hardwareDb.id!;
    }

    async update({ id, hardware, version }: UpdateParams) {

        this.#logger.debug(
            'update: id=%d, hardware=%o, version=%s',
            id,
            hardware,
            version,
        );
        
        if (id === undefined) {
            this.#logger.debug('update: No valid ID');
            throw new NotFoundException(`No Hardware with ID ${id}.`);
        }

        const validateResult = await this.#validateUpdate(hardware, id, version);
        this.#logger.debug('update: validateResult=%o', validateResult);
        if (!(validateResult instanceof Hardware)) {
            return validateResult;
        }

        const hardwareNew = validateResult;
        const merged = this.#repo.merge(hardwareNew, hardware);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged); // implizite Transaktion
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    async delete(id: number) {

        this.#logger.debug('delete: id=%d', id);

        const hardware = await this.#readService.findById({
            id,
            mitAbbildungen: true,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {

            const abbildungen = hardware.abbildungen ?? [];
            for (const abbildung of abbildungen) {
                await transactionalMgr.delete(Abbildung, abbildung.id);
            }

            deleteResult = await transactionalMgr.delete(Hardware, id);
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async #validateCreate({ name }: Hardware): Promise<undefined> {

        this.#logger.debug('#validateCreate: name=%s', name);

        if (await this.#repo.existsBy({ name })) {
            throw new HardwareNameExistsException(name);
        }
    }

    async #sendmail(hardware: Hardware) {
        const subject = `New hardware ${hardware.id}`;
        const titel = hardware.name? hardware.name : 'N/A';
        const body = `Hardware: <strong>${titel}</strong> has been created.`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        hardware: Hardware,
        id: number,
        versionStr: string,
    ): Promise<Hardware> {

        this.#logger.debug(
            '#validateUpdate: hardware=%o, id=%s, versionStr=%s',
            hardware,
            id,
            versionStr,
        );

        if (!HardwareWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        this.#logger.debug(
            '#validateUpdate: hardware=%o, version=%d',
            hardware,
            version,
        );

        const hardwareDb = await this.#readService.findById({ id });

        const versionDb = hardwareDb.version!;
        if (version < versionDb) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
        this.#logger.debug('#validateUpdate: hardwareDb=%o', hardwareDb);
        return hardwareDb;
    }
}