import { Body, Controller, Post } from '@nestjs/common';
import { directionsRoute, sumRouteMetrics } from './google';

type Point = { lat: number; lng: number; address?: string };

@Controller()
export class RoutesController {
  @Post('calculate-route')
  async calculate(@Body() body: { points: Point[]; options?: { origin?: Point; roundTrip?: boolean } }) {
    const points = Array.isArray(body?.points) ? body.points : [];
    const options = body?.options || {};
    if (points.length < 1) return { stops: [], distance_km: 0, duration_min: 0 };

    // Call Google Directions REST
    const dir = await directionsRoute(points, options);

    // Build ordered sequence using waypoint_order
    const hasOrigin = !!options.origin;
    const roundTrip = !!options.roundTrip;
    let origin: Point;
    let destination: Point;
    let waypoints: Point[] = [];
    if (hasOrigin && options.origin) {
      origin = options.origin;
      const rest = points.filter((p) => !(Math.abs(p.lat - origin.lat) < 1e-6 && Math.abs(p.lng - origin.lng) < 1e-6));
      if (roundTrip) {
        destination = origin;
        waypoints = rest;
      } else {
        // farthest as destination
        const withD = rest.map((p) => ({ p, d: Math.hypot(p.lat - origin.lat, p.lng - origin.lng) }));
        withD.sort((a, b) => b.d - a.d);
        destination = withD[0]?.p || rest[rest.length - 1];
        waypoints = rest.filter((p) => p !== destination);
      }
    } else {
      origin = points[0];
      destination = roundTrip ? points[0] : points[points.length - 1];
      waypoints = points.slice(1, roundTrip ? points.length : points.length - 1);
    }

    const order: number[] = Array.isArray(dir?.routes?.[0]?.waypoint_order) ? dir.routes[0].waypoint_order : [];
    let sequence: Point[] = [];
    if (hasOrigin) {
      sequence = [origin];
      for (const i of order) sequence.push(waypoints[i]);
      sequence.push(roundTrip ? origin : destination);
    } else {
      sequence = [points[0]];
      for (const i of order) sequence.push(points[1 + i]);
      sequence.push(points[points.length - 1]);
    }

    const metrics = sumRouteMetrics(dir);
    const stops = sequence.map((p) => ({ lat: p.lat, lng: p.lng, address: p.address || '' }));
    return { stops, distance_km: metrics.distance_km, duration_min: metrics.duration_min };
  }
}
