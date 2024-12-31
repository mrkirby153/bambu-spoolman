import { usePopupStore } from "@app/stores/popupStore";
import Configuration from "./Configuration";

function TestPopUp() {
  return <p>This is a test pop up</p>;
}

export default function Index() {
  const { open } = usePopupStore();

  const handleClick = () => {
    open(<TestPopUp />, {
      title: "Test Pop-Up",
    });
  };

  return (
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl text-center">Bambu Spoolman Integration</h1>
        <Configuration />
        <button
          onClick={handleClick}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Open Test Pop-Up
        </button>
      </div>
    </>
  );
}
