import type * as FaceApiType from "@vladmandic/face-api";

// Single shared instance across all components that use face-api.
// Without this, PhotoTagStep and PhotoFaceTagger each have their own
// module-level ref. When one loads the models first and the other tries
// to call loadFromUri on already-registered nets, face-api fails silently.

let faceApiMod: typeof FaceApiType | null = null;
let modelsLoading: Promise<typeof FaceApiType> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[faceApi] Timeout: ${label} after ${ms}ms`)), ms)
    ),
  ]);
}

export async function getFaceApi(): Promise<typeof FaceApiType> {
  if (faceApiMod) return faceApiMod;
  if (modelsLoading) return modelsLoading;
  modelsLoading = (async () => {
    try {
      const mod = await withTimeout(import("@vladmandic/face-api"), 15000, "import");
      const api = mod as unknown as typeof FaceApiType;

      // Force CPU backend to avoid competing with maplibre-gl for WebGL contexts.
      // The map exhausts the browser's WebGL context limit (~16), leaving none for TF.js.
      const tf = api.tf as unknown as { setBackend: (b: string) => Promise<void>; ready: () => Promise<void> };
      await withTimeout(tf.setBackend("cpu"), 10000, "setBackend");
      await withTimeout(tf.ready(), 10000, "tf.ready");

      await withTimeout(
        Promise.all([
          api.nets.ssdMobilenetv1.loadFromUri("/models/face-api"),
          api.nets.faceLandmark68TinyNet.loadFromUri("/models/face-api"),
          api.nets.faceRecognitionNet.loadFromUri("/models/face-api"),
        ]),
        30000,
        "loadModels"
      );
      faceApiMod = api;
      return api;
    } catch (err) {
      modelsLoading = null; // allow retry on next call
      throw err;
    }
  })();
  return modelsLoading;
}
