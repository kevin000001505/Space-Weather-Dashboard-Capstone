import "./App.css";
import PlaneTracker from "./components/plane-tracker/PlaneTracker";
import { Sidebar } from "./components/ui/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Help from "./components/help/Help";
import About from "./components/about/About";
import Landing from "./components/about/Landing";
import { Toaster } from "react-hot-toast";
import Charts from "./components/charts/Charts";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

function App() {
  const darkMode = useSelector((state) => state.ui.darkMode);
  const fontSizePercent = useSelector((state) => state.ui.fontSizePercent);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizePercent}%`;
  }, [fontSizePercent]);

  return (
    <Router>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div className={`${darkMode ? "dark" : ""}`}>
          <Toaster position="top-center" />
          <Sidebar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/map-dashboard" element={<PlaneTracker />} />
            <Route path="/analytics" element={<Charts />} />
            <Route path="/help" element={<Help />} />
            <Route path="/help/:topicSlug" element={<Help />} />
            <Route path="/help/:groupSlug/:topicSlug" element={<Help />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </LocalizationProvider>
    </Router>
  );
}

export default App;
