import "./App.css";
import PlaneTracker from "./components/plane-tracker/PlaneTracker";
import { Sidebar } from "./components/ui/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Help from "./components/help/Help";
import About from "./components/about/About";
import { Toaster } from "react-hot-toast";
import Charts from "./components/charts/Charts";

function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <Sidebar />
      <Routes>
      <Route path="/" element={<PlaneTracker />} />
      <Route path="/charts" element={<Charts />} />
      <Route path="/help" element={<Help />} />
      <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
