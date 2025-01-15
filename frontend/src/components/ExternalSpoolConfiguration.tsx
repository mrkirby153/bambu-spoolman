import useSettings from "@app/hooks/useSettings";
import { AmsSlot } from "./AmsConfiguration";

export default function ExternalSpoolConfiguration() {
  const { data } = useSettings();
  const activeSpool = data.trays["255"];

  return (
    <>
      <div className="flex">
        <AmsSlot slotId={255} spoolId={activeSpool} active={false} />
      </div>
    </>
  );
}
