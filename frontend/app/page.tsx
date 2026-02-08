import AmsComponent from "@/components/AmsComponent";

function AmsConfiguration() {
  return <AmsComponent id={0} />;
}

export default async function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl text-center">BambuLab Spoolman Integration</h1>
      <div className="mt-3">
        <div className="text-2xl">AMS Configuration</div>
        <div className="flex flex-col gap-3 md:flex-row">
          <AmsConfiguration />
        </div>
      </div>
    </div>
  );
}
