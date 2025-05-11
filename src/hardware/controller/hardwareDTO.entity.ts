import { ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, Length, Matches, Max, Min, Validate, ValidateNested, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import Decimal from "decimal.js";
import { HardwareType } from "../entity/hardware.entity.js";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { AbbildungDTO } from "./abbildungDTO.entity.js";


export const MAX_RATING = 5;

const number2Decimal = ({ value }: { value: Decimal.Value | undefined }) => {
    if (value === undefined) {
        return;
    }

    Decimal.set({ precision: 6 });
    return Decimal(value);
};

@ValidatorConstraint({ name: 'decimalMin', async: false })
class DecimalMin implements ValidatorConstraintInterface {
    validate(value: Decimal | undefined, args: ValidationArguments) {
        if (value === undefined) {
            return true;
        }
        const [minValue]: Decimal[] = args.constraints; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        return value.greaterThanOrEqualTo(minValue!);
    }

    defaultMessage(args: ValidationArguments) {
        return `Der Wert muss groesser oder gleich ${(args.constraints[0] as Decimal).toNumber()} sein.`;
    }
}


export class HardwareDtoWithoutRefs {

    @Length(1, 100)
    @ApiProperty({example: 'GeForce RTX 4090', type: String})
    readonly name!: string;

    @Matches(/^(GRAPHICS_CARD|PROCESSOR|MOTHERBOARD|RAM|SSD|HDD|POWER_SUPPLY|CASE|COOLER|FAN)$/u)
    @ApiProperty({example: 'SSD', type: String})
    readonly type!: HardwareType | undefined;

    @Length(1, 30)
    @ApiProperty({example: 'NVIDIA', type: String})
    readonly manufacturer!: string;

    @Transform(number2Decimal)
    @Validate(DecimalMin, [Decimal(0)], {
        message: 'preis muss positiv sein.',
    })
    @ApiProperty({example: 999.99, type: Number})
    readonly price!: Decimal;

    @IsInt()
    @Min(1)
    @Max(MAX_RATING)
    @ApiProperty({example: 4, type: Number})
    readonly rating!: number;

    @IsBoolean()
    @ApiProperty({ example: false, type: Boolean })
    readonly inStock!: boolean | undefined;

    @ArrayUnique()
    @ApiProperty({ example: ['GPU', 'PROCESSOR', 'DRIVE', 'DISK', 'COOLING'] })
    readonly tags!: string[] | undefined;
}

export class HardwareDTO extends HardwareDtoWithoutRefs{

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AbbildungDTO)
    @ApiProperty({type: [AbbildungDTO]})
    readonly abbildungen!: AbbildungDTO[] | undefined;
}