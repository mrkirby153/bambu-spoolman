import useSettings from "@app/hooks/useSettings";
import AmsConfiguration from "./AmsConfiguration";

function amsCount(trayCount: number) {
  return Math.ceil(trayCount / 4);
}

export default function Configuration() {
  const settings = useSettings();
  const trayCount = settings.isLoading ? 4 : settings.data.tray_count;
  const ams = amsCount(trayCount);

  const amsComponents = [];
  for (let i = 0; i < ams; i++) {
    amsComponents.push(<AmsConfiguration key={i} id={i} />);
  }

  return (
    <>
      <div>Configured AMS: {ams}</div>

      <h2 className="text-2xl">AMS Configuration</h2>
      <div>{amsComponents}</div>
    </>
  );
}
