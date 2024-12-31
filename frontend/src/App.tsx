import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import Index from "./components";
import Popup from "./components/Popup";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Index />
      <ReactQueryDevtools initialIsOpen={false} />
      <Popup />
    </QueryClientProvider>
  );
}

export default App;
