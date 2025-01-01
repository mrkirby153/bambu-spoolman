import { Suspense } from "react";
import Configuration from "./Configuration";

export default function Index() {
  return (
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl text-center">Bambu Spoolman Integration</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <Configuration />
        </Suspense>
      </div>
    </>
  );
}
