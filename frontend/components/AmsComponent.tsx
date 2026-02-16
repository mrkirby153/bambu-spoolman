import AmsTray from "./AmsTray";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Props = {
  id: number;
};

export default async function AmsComponent(props: Props) {
  const start = props.id * 4;
  const end = start + 4;
  const slots = [];
  for (let i = start; i < end; i++) {
    slots.push(<AmsTray key={i} id={i} />);
  }
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AMS {props.id + 1}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 flex-wrap justify-center">{slots}</div>
      </CardContent>
    </Card>
  );
}
