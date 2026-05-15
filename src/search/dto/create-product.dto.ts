import { IsNotEmpty, IsNumber, IsString, IsOptional } from "class-validator";

export class AddProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsNumber()
    @IsOptional()
    price?: number;
}
