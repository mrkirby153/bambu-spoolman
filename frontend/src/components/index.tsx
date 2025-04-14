import { Suspense } from "react";
import Configuration from "./Configuration";
import PrinterStatus from "./PrinterStatus";

export default function Index() {
  return (
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl text-center">Bambu Spoolman Integration</h1>
        <Suspense fallback={<div>Loading...</div>}>
          <p>Testing 1234</p>
          <div className="mb-3">
            <Configuration />
          </div>
          <PrinterStatus />
        </Suspense>
      </div>
    </>
  );
}
