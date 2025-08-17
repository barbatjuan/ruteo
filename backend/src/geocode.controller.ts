import { Body, Controller, Post } from '@nestjs/common';
import { geocodeAddress } from './google';

@Controller('geocode')
export class GeocodeController {
  @Post()
  async geocode(@Body() body: { address: string }[]) {
    const addresses = Array.isArray(body) ? body : [];
    const out: { address: string; lat: number | null; lng: number | null; normalized: string | null }[] = [];
    for (const a of addresses) {
      try {
        const data = await geocodeAddress(a.address);
        const r = data?.results?.[0];
        if (r?.geometry?.location) {
          out.push({ address: a.address, lat: r.geometry.location.lat, lng: r.geometry.location.lng, normalized: r.formatted_address || a.address });
        } else {
          out.push({ address: a.address, lat: null, lng: null, normalized: null });
        }
      } catch {
        out.push({ address: a.address, lat: null, lng: null, normalized: null });
      }
    }
    return out;
  }
}
