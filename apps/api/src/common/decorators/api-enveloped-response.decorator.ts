import type { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiMetaDto } from '../dto/api-response.dto.js';

/**
 * Use instead of @ApiOkResponse on every controller endpoint.
 * Generates OpenAPI spec that reflects the { data, meta } envelope,
 * so Swift OpenAPI Generator and Ktor OpenAPI Generator produce
 * envelope-aware client types.
 *
 * Example:
 * @Get(':id')
 * @ApiEnvelopedResponse(TripDto)
 * findOne(@Param('id') id: string) { ... }
 */
export function ApiEnvelopedResponse<T extends Type<unknown>>(model: T) {
  return applyDecorators(
    ApiExtraModels(ApiMetaDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
              meta: { $ref: getSchemaPath(ApiMetaDto) },
            },
            required: ['data', 'meta'],
          },
        ],
      },
    }),
  );
}
