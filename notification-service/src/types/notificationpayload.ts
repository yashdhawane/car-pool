export interface NotificationPayload {
  type: 'BOOKING_ACCEPTED' | 'BOOKING_REJECTED' | 'RIDE_FULLY_BOOKED';
  userId: string;
  rideId: string;
  email: string;
  source?: string;
  destination?: string;
  departureTime?: string;
  seats?: number;
  message: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  }
}