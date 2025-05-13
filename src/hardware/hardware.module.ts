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

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module.js';
import { KeycloakModule } from '../security/keycloak/keycloak.module.js';
import { entities } from './entity/entities.js';
import { HardwareMutationResolver } from './resolver/hardware-mutation.resolver.js';
import { HardwareQueryResolver } from './resolver/hardware_query.resolver.js';
import { QueryBuilder } from './service/query-builder.js';
import { HardwareGetController } from './controller/hardware_get.controller.js';
import { HardwareWriteController } from './controller/hardware_write.controller.js';
import { HardwareReadService } from './service/hardware_read.service.js';
import { HardwareWriteService } from './service/hardware_write.service.js';

/**
 * The module consists of controller and service classes for managing
 * hardware.
 * @packageDocumentation
 */

/**
 * The decorated module class with controller and service classes as well as
 * functionality for TypeORM.
 */
@Module({
    imports: [KeycloakModule, MailModule, TypeOrmModule.forFeature(entities)],
    controllers: [HardwareGetController, HardwareWriteController],
    // Provider are e.g. Service-Classes for DI
    providers: [
        HardwareReadService,
        HardwareWriteService,
        HardwareQueryResolver,
        HardwareMutationResolver,
        QueryBuilder,
    ],
    // Export of Providers for DI in other modules
    exports: [HardwareReadService, HardwareWriteService],
})
export class HardwareModule {}
