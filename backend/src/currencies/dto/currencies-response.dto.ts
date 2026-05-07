import { ApiProperty } from '@nestjs/swagger';

export class CurrenciesResponseDto {
  @ApiProperty({
    description: 'Supported ISO 4217 currency codes the app can display.',
    example: ['ILS', 'USD', 'EUR', 'GBP'],
    isArray: true,
    type: String,
  })
  supported!: string[];

  @ApiProperty({
    description: 'Default currency assigned when none is supplied.',
    example: 'ILS',
  })
  default!: string;

  @ApiProperty({
    description:
      'How many ILS one unit of each supported currency is worth. The frontend uses these rates for live display conversion.',
    example: { ILS: 1, USD: 3.7, EUR: 4.0, GBP: 4.7 },
    type: Object,
  })
  ratesInIls!: Record<string, number>;
}
