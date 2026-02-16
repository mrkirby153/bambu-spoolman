import { useSyncExternalStore } from "react";

let cameraAvailable = false;

function subscribe(onStoreChange: () => void) {
  const canCheckDevices =
    navigator.mediaDevices !== undefined &&
    navigator.mediaDevices.enumerateDevices !== undefined;
  const secureContext = typeof window !== "undefined" && window.isSecureContext;

  if (!(secureContext && canCheckDevices)) {
    cameraAvailable = false;
    onStoreChange();
    return () => {};
  }
  navigator.mediaDevices.enumerateDevices().then((device) => {
    cameraAvailable = device.some((d) => d.kind === "videoinput");
    onStoreChange();
  });

  const handleDeviceChange = () => {
    navigator.mediaDevices.enumerateDevices().then((device) => {
      const newCameraAvailable = device.some((d) => d.kind === "videoinput");
      cameraAvailable = newCameraAvailable;
      onStoreChange();
    });
  };

  navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
  return () => {
    navigator.mediaDevices.removeEventListener(
      "devicechange",
      handleDeviceChange,
    );
  };
}

export function useCameraAvailable() {
  return useSyncExternalStore(
    subscribe,
    () => cameraAvailable, // client snapshot
    () => false, // server snapshot
  );
}
