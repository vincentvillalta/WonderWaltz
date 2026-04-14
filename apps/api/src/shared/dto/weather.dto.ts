import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WeatherDto {
  @ApiProperty({
    description: 'Daily high temperature in Fahrenheit',
    example: 88,
  })
  high_f!: number;

  @ApiProperty({
    description: 'Daily low temperature in Fahrenheit',
    example: 72,
  })
  low_f!: number;

  @ApiProperty({
    description:
      'Weather condition from OpenWeather "main" field (e.g., "Clear", "Clouds", "Rain", "Thunderstorm")',
    example: 'Partly Cloudy',
  })
  condition!: string;

  @ApiProperty({
    description: 'Probability of precipitation as a percentage (0–100)',
    example: 30,
  })
  precipitation_pct!: number;

  @ApiProperty({
    description: 'Relative humidity as a percentage (0–100)',
    example: 75,
  })
  humidity_pct!: number;

  @ApiProperty({
    description: 'UV index for the day (used for sunscreen nudge in trip UI)',
    example: 9,
  })
  uv_index!: number;
}

export class WeatherQueryDto {
  @ApiPropertyOptional({
    description:
      "Date to fetch forecast for, in YYYY-MM-DD format. Only available within OpenWeather's 8-day forecast horizon. Dates beyond that window return null.",
    example: '2026-05-01',
  })
  date?: string;
}
