import fs from "fs";
import path from "path";

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
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
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });
    results.push(item);
  }
  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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

function escapeCSV(val: string): string {
  if (!val) return "";
  const clean = val.replace(/\s+/g, ' ').trim();
  if (clean.includes(",") || clean.includes('"') || clean.includes("\n")) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

async function run() {
  const sourcePath = path.resolve(process.cwd(), "data/india_colleges.csv.txt");
  const destPath = path.resolve(process.cwd(), "data/india_colleges.csv");

  console.log(`Reading source text file from: ${sourcePath}`);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found at: ${sourcePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, "utf-8");
  console.log("Parsing CSV lines...");
  const rows = parseCSV(content);
  console.log(`Parsed ${rows.length} rows.`);

  const uniqueColleges = new Map<string, any>();
  let skippedEmpty = 0;
  let duplicatesHandled = 0;

  for (const row of rows) {
    const rawName = row["College Name"] || row["college_name"] || row["Name"] || "";
    const cleanedName = rawName.replace(/\s+/g, ' ').trim();
    if (!cleanedName) {
      skippedEmpty++;
      continue;
    }

    // Extract ID (AISHE Code) if it exists in the name parenthesis
    const nameMatch = cleanedName.match(/^(.*?)\s*\(Id:\s*([^)]+)\)$/i);
    let name = cleanedName;
    let aishe_code = "";
    if (nameMatch) {
      name = nameMatch[1].trim();
      aishe_code = nameMatch[2].trim();
    }

    const state = (row["State Name"] || row["state"] || row["State"] || "").replace(/\s+/g, ' ').trim();
    const district = (row["District Name"] || row["district"] || row["District"] || "").replace(/\s+/g, ' ').trim();
    
    const key = `${name.toLowerCase()}|${state.toLowerCase()}|${district.toLowerCase()}`;

    const rawUniv = row["University Name"] || row["university_name"] || row["University"] || "";
    const univMatch = rawUniv.match(/^(.*?)\s*\(Id:\s*([^)]+)\)$/i);
    let university_affiliation = rawUniv.trim();
    if (univMatch) {
      university_affiliation = univMatch[1].trim();
    }

    const institution_type = (row["College Type"] || row["type"] || row["College Type"] || "").replace(/\s+/g, ' ').trim();
    const city = ""; // Not present in the source table
    const source = "AISHE_IMPORT";

    const item = {
      name,
      aishe_code,
      state,
      district,
      city,
      institution_type,
      university_affiliation,
      source
    };

    if (uniqueColleges.has(key)) {
      duplicatesHandled++;
      const existing = uniqueColleges.get(key);
      uniqueColleges.set(key, {
        ...item,
        aishe_code: item.aishe_code || existing.aishe_code,
        university_affiliation: item.university_affiliation || existing.university_affiliation,
        institution_type: item.institution_type || existing.institution_type,
      });
    } else {
      uniqueColleges.set(key, item);
    }
  }

  console.log(`Writing cleaned data into CSV at: ${destPath}`);
  const writeStream = fs.createWriteStream(destPath, { encoding: "utf-8" });
  writeStream.write("name,aishe_code,state,district,city,institution_type,university_affiliation,source\n");

  for (const item of uniqueColleges.values()) {
    const line = [
      escapeCSV(item.name),
      escapeCSV(item.aishe_code),
      escapeCSV(item.state),
      escapeCSV(item.district),
      escapeCSV(item.city),
      escapeCSV(item.institution_type),
      escapeCSV(item.university_affiliation),
      escapeCSV(item.source)
    ].join(",");
    writeStream.write(line + "\n");
  }

  writeStream.end();
  console.log("-----------------------------------------");
  console.log("CONVERSION REPORT:");
  console.log(`Total rows processed:  ${rows.length}`);
  console.log(`Skipped empty:         ${skippedEmpty}`);
  console.log(`Duplicates merged:     ${duplicatesHandled}`);
  console.log(`Final output rows:     ${uniqueColleges.size}`);
  console.log("-----------------------------------------");
  console.log("CSV conversion complete!");
}

run().catch((err) => {
  console.error("Conversion failed:", err);
  process.exit(1);
});
