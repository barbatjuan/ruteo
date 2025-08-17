import { Controller, Get, Query } from '@nestjs/common';
import { placeDetails, placesAutocomplete } from './google';

@Controller('places')
export class PlacesController {
  @Get('autocomplete')
  async autocomplete(@Query('q') q?: string, @Query('session') session?: string) {
    const input = q || '';
    if (!input || input.trim().length < 2) return [];
    try {
      const data = await placesAutocomplete(input, session);
      const preds = Array.isArray(data?.predictions) ? data.predictions : [];
      return preds.map((p: any) => ({ description: p.description, place_id: p.place_id }));
    } catch (e: any) {
      // Log and return empty list to keep UI usable
      // eslint-disable-next-line no-console
      console.error('places/autocomplete error', e?.response?.data || e?.message || e);
      return [];
    }
  }

  @Get('details')
  async details(@Query('place_id') placeId: string, @Query('session') session?: string) {
    if (!placeId) return { error: 'place_id required' };
    try {
      const data = await placeDetails(placeId, session);
      const r = data?.result;
      const loc = r?.geometry?.location;
      if (!loc) return { error: 'not_found' };
      return { lat: loc.lat, lng: loc.lng, normalized: r?.formatted_address || '' };
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('places/details error', e?.response?.data || e?.message || e);
      return { error: 'upstream_error' } as any;
    }
  }
}
