const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, "submissions.json");

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

const SETTINGS_FILE = path.join(__dirname, "settings.json");
const defaultSettings = {
  isBookingOpen: true,
  openMonday: true,
  openSaturday: false,
  specialSundayBreakfast: false,
  everydayStart: "18:00",
  everydayEnd: "21:30",
  saturdayStart: "13:30",
  saturdayEnd: "16:30",
  specialStart: "18:00",
  specialEnd: "21:30",
  tokenLink: "https://nist-university-admin.example.com"
};

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      writeSettings(defaultSettings);
      return defaultSettings;
    }
    return { ...defaultSettings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) };
  } catch (e) {
    return defaultSettings;
  }
}
function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
}

app.get("/api/settings", (req, res) => {
  res.json({ success: true, settings: readSettings() });
});
app.post("/api/settings", (req, res) => {
  const currentSettings = readSettings();
  const newSettings = { ...currentSettings, ...req.body };
  writeSettings(newSettings);
  res.json({ success: true, settings: newSettings });
});

app.get("/api/list", (req, res) => {
  const records = readData();
  // Sort by bookingDate (descending) and then name
  records.sort((a, b) => {
    const dateA = new Date(a.bookingDate || 0);
    const dateB = new Date(b.bookingDate || 0);
    if (dateB - dateA !== 0) return dateB - dateA;
    return a.name.localeCompare(b.name);
  });
  res.json({ success: true, records });
});

app.post("/api/submit", (req, res) => {
  const payload = req.body;
  if (!payload?.roll || !payload?.name) {
    return res.status(400).json({ success: false, message: "Missing required fields (roll or name)." });
  }

  const settings = readSettings();
  if (!settings.isBookingOpen) {
    return res.status(403).json({ success: false, message: "Booking is currently closed by admin." });
  }

  const records = readData();
  const bookingDate = payload.bookingDate || new Date().toISOString().slice(0, 10);
  
  // Strict duplicate check: Same roll AND same bookingDate
  if (records.some(r => r.roll.toLowerCase() === payload.roll.toLowerCase() && r.bookingDate === bookingDate)) {
    return res.status(400).json({ success: false, message: "Roll number already has a token for this day." });
  }

  // Ensure fields are recorded consistently
  const newRecord = {
    ...payload,
    bookingDate: bookingDate,
    timestamp: new Date().toISOString()
  };

  records.push(newRecord);
  writeData(records);
  return res.json({ success: true, message: "Booking successful", record: newRecord });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});