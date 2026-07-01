import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Manually parse .env if process.env variables are missing
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.trim().match(/^([^#\s][\w.-]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  console.error("Please add your SUPABASE_SERVICE_ROLE_KEY (Service Role Key) to .env to import data.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

// Keys mappings for flexible CSV headers support
const nameKeys = [
  "name", "college_name", "institution_name", "institute_name", "university_name",
  "Name", "College Name", "Institution Name", "Institute Name", "University Name"
];
const aisheKeys = ["aishe_code", "AISHE Code", "aishe", "AISHE"];
const stateKeys = ["state", "State", "State Name"];
const districtKeys = ["district", "District", "District Name"];
const cityKeys = ["city", "City", "address_city"];
const typeKeys = ["institution_type", "Institution Type", "type", "Type", "category", "Category"];
const affiliationKeys = [
  "university_affiliation", "University Affiliation", "affiliating_university",
  "Affiliating University", "university", "University"
];
const sourceKeys = ["source", "Source"];

function getFieldValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined) {
      return row[key] ? row[key].trim() : "";
    }
  }
  return "";
}

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

async function run() {
  const csvPath = fs.existsSync(path.resolve(process.cwd(), "data/india_colleges.csv"))
    ? path.resolve(process.cwd(), "data/india_colleges.csv")
    : path.resolve(process.cwd(), "data/india_colleges.sample.csv");

  console.log(`Reading CSV file from: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);

  let totalRowsRead = 0;
  let validRows = 0;
  let skippedRows = 0;
  let duplicateRowsHandled = 0;
  let upsertedCount = 0;

  const uniqueColleges = new Map<string, any>();

  for (const row of rows) {
    totalRowsRead++;
    
    // Extract and normalize name (remove duplicate spaces)
    const rawName = getFieldValue(row, nameKeys);
    const name = rawName.replace(/\s+/g, ' ').trim();
    
    if (!name) {
      skippedRows++;
      continue;
    }
    validRows++;

    const normalizedName = name.toLowerCase();
    const state = getFieldValue(row, stateKeys).replace(/\s+/g, ' ').trim();
    const district = getFieldValue(row, districtKeys).replace(/\s+/g, ' ').trim();
    const key = `${normalizedName}|${state.toLowerCase()}|${district.toLowerCase()}`;

    // Extract other attributes
    const aishe_code = getFieldValue(row, aisheKeys).replace(/\s+/g, ' ').trim() || null;
    const city = getFieldValue(row, cityKeys).replace(/\s+/g, ' ').trim() || null;
    const institution_type = getFieldValue(row, typeKeys).replace(/\s+/g, ' ').trim() || null;
    const university_affiliation = getFieldValue(row, affiliationKeys).replace(/\s+/g, ' ').trim() || null;
    
    let source = getFieldValue(row, sourceKeys).replace(/\s+/g, ' ').trim();
    if (!source) {
      source = "AISHE_IMPORT";
    } else {
      const upperSource = source.toUpperCase();
      if (upperSource === "AISHE") source = "AISHE_IMPORT";
      else if (upperSource === "UGC") source = "UGC_IMPORT";
      else if (upperSource === "AICTE") source = "AICTE_IMPORT";
    }

    const firstLetter = name.charAt(0).toUpperCase();
    const verified = true; // All imported rows verified as true

    const collegeItem = {
      name,
      normalized_name: normalizedName,
      aishe_code,
      state: state || null,
      district: district || null,
      city: city || null,
      institution_type,
      university_affiliation,
      source,
      verified,
      first_letter: firstLetter,
    };

    if (uniqueColleges.has(key)) {
      duplicateRowsHandled++;
      // Merge: fill in missing fields from the new row if available
      const existing = uniqueColleges.get(key);
      uniqueColleges.set(key, {
        ...collegeItem,
        aishe_code: collegeItem.aishe_code || existing.aishe_code,
        city: collegeItem.city || existing.city,
        institution_type: collegeItem.institution_type || existing.institution_type,
        university_affiliation: collegeItem.university_affiliation || existing.university_affiliation,
        source: collegeItem.source || existing.source,
      });
    } else {
      uniqueColleges.set(key, collegeItem);
    }
  }

  const collegesToInsert = Array.from(uniqueColleges.values());
  console.log(`Found ${collegesToInsert.length} unique colleges to import after deduplication.`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < collegesToInsert.length; i += BATCH_SIZE) {
    const batch = collegesToInsert.slice(i, i + BATCH_SIZE);
    
    // Upsert to handle updates and insert new records
    const { error } = await supabase.from("colleges").upsert(batch, {
      onConflict: "normalized_name,state,district",
    });

    if (error) {
      console.error(`Error importing batch starting at index ${i}:`, error.message);
    } else {
      upsertedCount += batch.length;
    }
  }

  console.log("\n-----------------------------------------");
  console.log("IMPORT RESULTS SUMMARY:");
  console.log(`CSV file used:              ${csvPath}`);
  console.log(`Total rows read:            ${totalRowsRead}`);
  console.log(`Valid rows:                 ${validRows}`);
  console.log(`Skipped rows (empty name):  ${skippedRows}`);
  console.log(`Duplicate rows handled:     ${duplicateRowsHandled}`);
  console.log(`Successfully upserted:      ${upsertedCount} institutions`);
  console.log("-----------------------------------------\n");
  console.log(`Imported ${upsertedCount} institutions into colleges table successfully.`);
}

run().catch((err) => {
  console.error("Import script failed:", err);
  process.exit(1);
});
