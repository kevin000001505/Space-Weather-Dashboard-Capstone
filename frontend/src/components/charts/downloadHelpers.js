// downloadHelpers.js
// Helper functions for DownloadPanel.jsx

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printContent(content) {
  const printWindow = window.open("", "", "width=800,height=600");
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

export function toCSV(data) {
  if (!data.length) return "";
  const keys = Object.keys(data[0]);
  const rows = data.map(row => keys.map(k => row[k]).join(","));
  return keys.join(",") + "\n" + rows.join("\n");
}

export function toJSON(data) {
  return JSON.stringify(data, null, 2);
}

export function toHTML(data) {
  if (!data.length) return "";
  const keys = Object.keys(data[0]);
  const header = '<tr>' + keys.map(k => `<th>${k}</th>`).join("") + '</tr>';
  const rows = data.map(row => '<tr>' + keys.map(k => `<td>${row[k]}</td>`).join("") + '</tr>');
  return `<table border="1">${header}${rows.join('')}</table>`;
}

export function toXML(data) {
  if (!data.length) return "";
  const keys = Object.keys(data[0]);
  return (
    '<root>' +
    data.map(row =>
      '<item>' + keys.map(k => `<${k}>${row[k]}</${k}>`).join("") + '</item>'
    ).join("") +
    '</root>'
  );
}

export function getChartName(tab) {
  if (tab === 0) return "kp-index";
  if (tab === 1) return "xray-flux";
  if (tab === 2) return "proton-flux";
  return "chart";
}

export function formatDateString(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}
