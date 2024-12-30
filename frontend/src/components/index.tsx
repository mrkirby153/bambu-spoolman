import useSettingsStore from "@app/stores/settings";

export default function Index() {
  const { trayCount } = useSettingsStore();
  return <div>Index {trayCount}</div>;
}
