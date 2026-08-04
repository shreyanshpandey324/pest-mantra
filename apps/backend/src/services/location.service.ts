import { Location } from "../models/Location";

export class LocationService {
  /**
   * Save latest GPS location
   */
  static async updateLocation(data: {
    technicianId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    batteryLevel?: number;
    isCharging?: boolean;
  }) {
    return await Location.create({
      technicianId: data.technicianId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy ?? 0,
      speed: data.speed ?? 0,
      heading: data.heading ?? 0,
      batteryLevel: data.batteryLevel ?? 100,
      isCharging: data.isCharging ?? false,
      recordedAt: new Date(),
    });
  }

  /**
   * Latest location of one technician
   */
  static async getLatestLocation(technicianId: string) {
    return await Location.findOne({ technicianId })
      .sort({ recordedAt: -1 })
      .lean();
  }

  /**
   * Latest location of all technicians
   */
  static async getLiveLocations() {
    const locations = await Location.aggregate([
      {
        $sort: {
          recordedAt: -1,
        },
      },
      {
        $group: {
          _id: "$technicianId",
          latest: {
            $first: "$$ROOT",
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$latest",
        },
      },
    ]);

    return locations;
  }
}