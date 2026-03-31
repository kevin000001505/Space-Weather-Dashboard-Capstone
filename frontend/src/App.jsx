import "./App.css";
import PlaneTracker from "./components/plane-tracker/PlaneTracker";
import { Sidebar } from "./components/ui/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Help from "./components/help/Help";
import About from "./components/about/About";
import { Toaster } from "react-hot-toast";
import Charts from "./components/charts/Charts";
import { useSelector } from "react-redux";
import { useEffect } from "react";

function App() {
  const darkMode = useSelector((state) => state.ui.darkMode);
  const fontSizePercent = useSelector((state) => state.ui.fontSizePercent);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizePercent}%`;
  }, [fontSizePercent]);

  return (
    <Router>
      <div className={`${darkMode ? "dark" : ""}`}>
        <Toaster position="top-center" />
        <Sidebar />
        <Routes>
          <Route path="/" element={<PlaneTracker />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
