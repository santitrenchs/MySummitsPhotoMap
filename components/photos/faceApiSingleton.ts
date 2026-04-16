import type * as FaceApiType from "@vladmandic/face-api";

// Single shared instance across all components that use face-api.
// Without this, PhotoTagStep and PhotoFaceTagger each have their own
// module-level ref. When one loads the models first and the other tries
// to call loadFromUri on already-registered nets, face-api fails silently.

let faceApiMod: typeof FaceApiType | null = null;
let modelsLoading: Promise<typeof FaceApiType> | null = null;

export async function getFaceApi(): Promise<typeof FaceApiType> {
  if (faceApiMod) return faceApiMod;
  if (modelsLoading) return modelsLoading;
  modelsLoading = (async () => {
    const mod = await import("@vladmandic/face-api");
    const api = mod as unknown as typeof FaceApiType;

    // Force CPU backend to avoid competing with maplibre-gl for WebGL contexts.
    // The map exhausts the browser's WebGL context limit (~16), leaving none for TF.js.
    await api.tf.setBackend("cpu");
    await api.tf.ready();

    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri("/models/face-api"),
      api.nets.faceLandmark68TinyNet.loadFromUri("/models/face-api"),
      api.nets.faceRecognitionNet.loadFromUri("/models/face-api"),
    ]);
    faceApiMod = api;
    return api;
  })();
  return modelsLoading;
}
