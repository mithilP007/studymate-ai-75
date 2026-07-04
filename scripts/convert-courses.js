import fs from "fs";
import path from "path";

function parseCSV(text) {
  const lines = [];
  let currentLine = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      continue;
    }
    currentLine += char;
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });
    results.push(item);
  }
  return results;
}

function parseCSVLine(line) {
  const result = [];
  let cell = "";
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === ',' && !insideQuote) {
      result.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  result.push(cell.trim());
  return result;
}

async function run() {
  const csvPath = path.resolve(process.cwd(), "Indian_Course_Category.csv");
  console.log(`Reading CSV file from: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);

  const courses = {};

  for (const row of rows) {
    const courseName = row["Course_Name"]?.trim();
    const branchName = row["Branch_Department"]?.trim();
    const semestersStr = row["Semesters"]?.trim();

    if (!courseName || !branchName) continue;

    const semesters = parseInt(semestersStr, 10) || 8;

    if (!courses[courseName]) {
      courses[courseName] = {
        semesters: semesters,
        branches: new Set()
      };
    } else {
      // Update semesters if a larger one is found (just in case)
      if (semesters > courses[courseName].semesters) {
        courses[courseName].semesters = semesters;
      }
    }
    courses[courseName].branches.add(branchName);
  }

  // Convert Set to Array for JSON serialization
  const output = {};
  for (const [courseName, data] of Object.entries(courses)) {
    output[courseName] = {
      semesters: data.semesters,
      branches: Array.from(data.branches).sort()
    };
  }

  const outputPath = path.resolve(process.cwd(), "src/data/courses.json");
  // Make sure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Successfully generated courses JSON with ${Object.keys(output).length} courses!`);
}

run().catch((err) => {
  console.error("Conversion failed:", err);
  process.exit(1);
});
