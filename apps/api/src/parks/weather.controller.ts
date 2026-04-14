import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { WeatherDto, WeatherQueryDto } from '../shared/dto/weather.dto.js';

@ApiTags('parks')
@Controller('weather')
export class WeatherController {
  /**
   * GET /v1/weather?date=YYYY-MM-DD
   * Returns Orlando weather forecast for the given date.
   * Live implementation delivered in plan 02-09 (WeatherModule).
   * Returns null when date is beyond OpenWeather's 8-day horizon.
   */
  @Get()
  @ApiOperation({
    summary: 'Get Orlando weather forecast for a date',
    description:
      'Returns a weather forecast for the given date. ' +
      "Returns null if the date is beyond OpenWeather's 8-day forecast horizon. " +
      'Responses are cached in Redis for 6 hours.',
  })
  @ApiEnvelopedResponse(WeatherDto)
  getWeather(@Query() _query: WeatherQueryDto): WeatherDto | null {
    // Real implementation: WeatherModule reads from Redis/OpenWeather in plan 02-09
    return null;
  }
}
