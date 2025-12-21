import useSettings from "@app/hooks/useSettings";
import AmsConfiguration from "./AmsConfiguration";
import ExternalSpoolConfiguration from "./ExternalSpoolConfiguration";

function amsCount(trayCount: number) {
  return Math.ceil(trayCount / 4);
}

export default function Configuration() {
  const { data } = useSettings();
  const trayCount = data.tray_count || 0;
  const ams = amsCount(trayCount);

  const amsComponents = [];
  for (let i = 0; i < ams; i++) {
    amsComponents.push(<AmsConfiguration key={i} id={i} />);
  }

  return (
    <>
      <div>
        <h2 className="text-2xl">External Spool Configuration</h2>
        <ExternalSpoolConfiguration />
      </div>
      {ams > 0 && (
        <div className="mt-3">
          <h2 className="text-2xl">AMS Configuration</h2>
          <div className="flex flex-col gap-3 md:flex-row">{amsComponents}</div>
        </div>
      )}
    </>
  );
}
