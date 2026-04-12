// Augment NextAuth's Session type to carry tenantId and user id
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      tenantId: string;
      isAdmin: boolean;
    };
  }
}

// JWT augmentation lives in types/next-auth-jwt.d.ts (plain .d.ts file avoids
// moduleResolution:bundler issues with subpath augmentations)

// Re-export for convenience
export type { Session } from "next-auth";

// Bounding box returned by face-api.js and stored in FaceDetection.boundingBox
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

// Storage key helpers
export function photoStorageKey(tenantId: string, photoId: string): string {
  return `tenant/${tenantId}/photos/${photoId}.jpg`;
}

export function faceStorageKey(tenantId: string, faceId: string): string {
  return `tenant/${tenantId}/faces/${faceId}.jpg`;
}
