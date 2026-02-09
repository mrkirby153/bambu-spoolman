import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupProps,
} from "@/components/ui/radio-group";
import { Spool } from "@/lib/proto/bambu_spoolman/grpc/spoolman";
import { Label } from "../ui/label";
import { SpoolChip } from "../SpoolChip";

interface Props extends RadioGroupProps {
  spools: Spool[];
}

export function SpoolRadioGroup({ spools, ...props }: Props) {
  const spoolComponents = spools.map((spool) => (
    <div
      key={spool.id}
      className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent has-disabled:bg-transparent has-disabled:opacity-50 [&:has(:disabled)>label]:cursor-not-allowed [&>label]:cursor-pointer"
    >
      <RadioGroupItem value={spool.id.toString()} id={`spool-${spool.id}`} />
      <Label
        htmlFor={`spool-${spool.id}`}
        className="flex items-center gap-3 w-full"
      >
        <SpoolChip spool={spool} size="small" />
        <div className="flex-1">
          <div className="font-medium">
            {spool.filament?.material ?? "Unknown"}
          </div>
          <div className="text-sm text-muted-foreground">
            ID: {spool.id} • {spool.remainingWeight}g remaining
          </div>
        </div>
      </Label>
    </div>
  ));
  return (
    <RadioGroup {...props}>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {spools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No spools found
          </div>
        ) : (
          spoolComponents
        )}
      </div>
    </RadioGroup>
  );
}
