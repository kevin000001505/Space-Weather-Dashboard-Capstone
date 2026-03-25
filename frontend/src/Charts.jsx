import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import TopBar from "./components/charts/TopBar";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin,
);
import ChartsTabs from "./components/charts/ChartsTabs";

export default function Charts() {
  return (
      <>
        <TopBar />
        <ChartsTabs />
      </>
  );
}
