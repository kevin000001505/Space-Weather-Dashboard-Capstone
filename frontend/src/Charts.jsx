import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent
} from "@mui/material";

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
  Legend
} from "chart.js";

import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const options = {
  responsive: true,
  maintainAspectRatio: false
};

export default function Charts() {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  const dataset = {
    labels,
    datasets: [
      {
        label: "Placeholder",
        data: [12, 19, 3, 5, 2, 9],
        backgroundColor: "rgba(25,118,210,0.5)"
      }
    ]
  };

  const pieData = {
    labels: ["Red", "Blue", "Yellow"],
    datasets: [
      {
        data: [30, 40, 30],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"]
      }
    ]
  };

  const ChartCard = ({ title, children }) => (
    <Card sx={{ height: 350 }}>
      <CardContent sx={{ height: "100%" }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ height: "85%" }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box padding={6}>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartCard title="Placeholder Chart 1">
            <Bar data={dataset} options={options} />
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Placeholder Chart 2">
            <Line data={dataset} options={options} />
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard title="Placeholder Chart 3">
            <Pie data={pieData} options={options} />
          </ChartCard>
        </Grid>

      </Grid>
    </Box>
  );
}