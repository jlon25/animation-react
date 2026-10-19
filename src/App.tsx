import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Example1 from "./pages/Example1";
import Example2 from "./pages/Example2";
import Example3 from "./pages/Example3";
import Example4 from "./pages/Example4";
import Example5 from "./pages/Example5";
import Example6 from "./pages/Example6";
import Example7 from "./pages/Example7";
import Example8 from "./pages/Example8";
import Example9 from "./pages/Example9";
import Example10 from "./pages/Example10";
import Example11 from "./pages/Example11";
import Example12 from "./pages/Example12";
import Example13 from "./pages/Example13";
import "./css/styles.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/example1" element={<Example1 />} />
        <Route path="/example2" element={<Example2 />} />
        <Route path="/example3" element={<Example3 />} />
        <Route path="/example4" element={<Example4 />} />
        <Route path="/example5" element={<Example5 />} />
        <Route path="/example6" element={<Example6 />} />
        <Route path="/example7" element={<Example7 />} />
        <Route path="/example8" element={<Example8 />} />
        <Route path="/example9" element={<Example9 />} />
        <Route path="/example10" element={<Example10 />} />
        <Route path="/example11" element={<Example11 />} />
        <Route path="/example12" element={<Example12 />} />
        <Route path="/example13" element={<Example13 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
