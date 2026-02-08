import AmsTray from "./AmsTray";

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
    <div className="border border-black p-2 rounded-sm">
      <div className="text-xl">AMS {props.id + 1}</div>
      <div className="flex space-x-2 pt-2 flex-row">{slots}</div>
    </div>
  );
}
