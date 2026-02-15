import { Routes, Route } from "react-router-dom";
import Shop from "./pages/Shop";

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      <Route path="/shop" element={<Shop />} />
    </Routes>
  );
}

export default App;