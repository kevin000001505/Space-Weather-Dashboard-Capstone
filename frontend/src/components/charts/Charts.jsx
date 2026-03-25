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
import ChartsTabs from "./ChartsTabs";
import TopBar from "./TopBar";

export default function Charts() {
  return (
      <>
        <TopBar />
        <ChartsTabs />
      </>
  );
}
