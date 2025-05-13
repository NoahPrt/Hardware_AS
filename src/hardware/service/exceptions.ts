// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/* eslint-disable max-classes-per-file */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * This module consists of classes for error handling in the management
 * of hardware, e.g., during database access.
 * @packageDocumentation
 */

/**
 * Exception-Class for an existing Hardware name.
 */
export class HardwareNameExistsException extends HttpException {
    readonly hardwareName: string | undefined;

    constructor(hardwareName: string | undefined) {
        super(
            `The HardwareName ${hardwareName} already exists.`,
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
        this.hardwareName = hardwareName;
    }
}

/**
 * Exception-Class for an invalid version number when updating hardware.
 */
export class VersionInvalidException extends HttpException {
    readonly version: string | undefined;

    constructor(version: string | undefined) {
        super(
            `Die Versionsnummer ${version} ist ungueltig.`,
            HttpStatus.PRECONDITION_FAILED,
        );
        this.version = version;
    }
}

/**
 * Exception-Class for an outdated version number when updating hardware.
 */
export class VersionOutdatedException extends HttpException {
    readonly version: number;

    constructor(version: number) {
        super(
            `Die Versionsnummer ${version} ist nicht aktuell.`,
            HttpStatus.PRECONDITION_FAILED,
        );
        this.version = version;
    }
}

/* eslint-enable max-classes-per-file */
