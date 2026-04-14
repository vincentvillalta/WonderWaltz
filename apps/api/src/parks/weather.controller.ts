import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { WeatherDto, WeatherQueryDto } from '../shared/dto/weather.dto.js';
import { ParksService } from './parks.service.js';

@ApiTags('parks')
@Controller('weather')
export class WeatherController {
  constructor(private readonly parksService: ParksService) {}

  /**
   * GET /v1/weather?date=YYYY-MM-DD
   * Returns Orlando weather forecast for the given date.
   * Delegates to WeatherService (cache-aside Redis + OpenWeather One Call 3.0).
   * Returns null when date is beyond the 8-day horizon or on any error.
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
  async getWeather(@Query() query: WeatherQueryDto): Promise<WeatherDto | null> {
    if (!query.date) {
      return null;
    }
    return this.parksService.getWeather(query.date);
  }
}
