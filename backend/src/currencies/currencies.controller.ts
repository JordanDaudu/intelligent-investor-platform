import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CurrenciesResponseDto } from './dto/currencies-response.dto';

@ApiTags('currencies')
@Controller('api/currencies')
export class CurrenciesController {
  constructor(private readonly currencies: CurrenciesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List supported currencies and the rate table',
    description:
      'Returns the supported ISO codes, the default currency, and the ILS-anchored rate table the frontend uses for live display conversion.',
  })
  @ApiOkResponse({ type: CurrenciesResponseDto })
  list(): CurrenciesResponseDto {
    return {
      supported: [...this.currencies.supported],
      default: this.currencies.default,
      ratesInIls: this.currencies.ratesInIls,
    };
  }
}
