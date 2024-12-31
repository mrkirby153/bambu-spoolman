import useSettings from "@app/hooks/useSettings";

function AnotherComponent() {
  const settings = useSettings();
  return <div>Data: {JSON.stringify(settings.data)}</div>;
}

export default function Index() {
  const settings = useSettings();

  return (
    <>
      <AnotherComponent />
      <div>Trays: {settings.data.tray_count}</div>
    </>
  );
}
