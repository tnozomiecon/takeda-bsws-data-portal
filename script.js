const DATA_URL = "data/bsws_sample.csv";

let rows = [];
let filteredRows = [];

const filters = {
  year: document.getElementById("yearFilter"),
  sex: document.getElementById("sexFilter"),
  age_group: document.getElementById("ageFilter"),
  education: document.getElementById("educationFilter")
};

const table = document.getElementById("dataTable");
const resultCount = document.getElementById("resultCount");

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCSVLine(lines.shift());
  return lines
    .filter(line => line.trim().length > 0)
    .map(line => {
      const values = splitCSVLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
}

function splitCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function uniqueSorted(key) {
  return [...new Set(rows.map(row => row[key]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "en", { numeric: true }));
}

function populateFilter(select, values) {
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function applyFilters() {
  filteredRows = rows.filter(row => {
    return Object.entries(filters).every(([key, select]) => {
      return !select.value || row[key] === select.value;
    });
  });

  renderTable(filteredRows);
  resultCount.textContent = `${filteredRows.length.toLocaleString()} rows selected`;
}

function renderTable(data) {
  table.querySelector("thead").innerHTML = "";
  table.querySelector("tbody").innerHTML = "";

  if (!data.length) {
    table.querySelector("tbody").innerHTML = "<tr><td>No rows match the selected filters.</td></tr>";
    return;
  }

  const headers = Object.keys(data[0]);
  const headerRow = document.createElement("tr");

  for (const header of headers) {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  }

  table.querySelector("thead").appendChild(headerRow);

  for (const row of data.slice(0, 50)) {
    const tr = document.createElement("tr");
    for (const header of headers) {
      const td = document.createElement("td");
      td.textContent = row[header];
      tr.appendChild(td);
    }
    table.querySelector("tbody").appendChild(tr);
  }
}

function toCSV(data) {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const body = data.map(row => headers.map(header => escapeCSV(row[header])).join(","));
  return [headers.join(","), ...body].join("\n");
}

function escapeCSV(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
  return str;
}

function downloadFilteredCSV() {
  const csv = toCSV(filteredRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bsws_filtered_demo.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function updateMetrics() {
  const years = uniqueSorted("year");
  const vars = rows.length ? Object.keys(rows[0]) : [];

  document.getElementById("metricRows").textContent = rows.length.toLocaleString();
  document.getElementById("metricYears").textContent =
    years.length ? `${years[0]}–${years[years.length - 1]}` : "—";
  document.getElementById("metricVars").textContent = vars.length.toString();
}

function resetFilters() {
  Object.values(filters).forEach(select => {
    select.value = "";
  });
  applyFilters();
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);

    rows = parseCSV(await response.text());
    filteredRows = rows;

    populateFilter(filters.year, uniqueSorted("year"));
    populateFilter(filters.sex, uniqueSorted("sex"));
    populateFilter(filters.age_group, uniqueSorted("age_group"));
    populateFilter(filters.education, uniqueSorted("education"));

    Object.values(filters).forEach(select => select.addEventListener("change", applyFilters));
    document.getElementById("resetButton").addEventListener("click", resetFilters);
    document.getElementById("downloadButton").addEventListener("click", downloadFilteredCSV);

    updateMetrics();
    applyFilters();
  } catch (error) {
    resultCount.textContent = "Data could not be loaded.";
    console.error(error);
  }
}

init();
