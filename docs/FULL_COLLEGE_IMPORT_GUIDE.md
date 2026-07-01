# Full India College Dataset Import Guide

This guide explains how to import the complete database of higher education institutions in India into StudyMate AI.

## Current Setup Status
During local development, the application is pre-loaded with a small sample of 21 colleges for testing purposes (including the `Kathir College of Engineering` test row). To enable a complete search experience for all users, you need to import the official Government of India dataset.

---

## Step 1: Download the Official Datasets

You can obtain the complete Higher Education Institution Directories from the following official government sources:

1. **AISHE (All India Survey on Higher Education)**:
   * **Source**: [AISHE Portal](https://aishe.gov.in/) or [data.gov.in](https://data.gov.in/) (Search for "AISHE College Directory" or "AISHE Institution Directory").
   * **Format**: Download as a CSV file.
   * This is the primary directory, containing over 45,000+ colleges.

2. **UGC (University Grants Commission)**:
   * **Source**: [UGC Recognized Universities List](https://www.ugc.gov.in/).
   * Useful for ensuring all national, state, private, and deemed universities are seeded.

3. **AICTE (All India Council for Technical Education)**:
   * **Source**: [AICTE Approved Institutions](https://www.aicte-india.org/).
   * Useful for specialized technical, engineering, and polytechnic institutes.

---

## Step 2: Place the CSV File

Once downloaded, rename or export your spreadsheet as a CSV file and save it in the project directory at:
```
data/india_colleges.csv
```
*(Make sure the directory `data/` exists at the root of the project).*

### Supported Column Names
The import script is highly flexible and will automatically map any of the following column names from your CSV:

* **College Name**: `name`, `college_name`, `institution_name`, `institute_name`, `university_name`, `Name`, `College Name`, `Institution Name`, `Institute Name`, `University Name`
* **AISHE Code**: `aishe_code`, `AISHE Code`, `aishe`, `AISHE`
* **State**: `state`, `State`, `State Name`
* **District**: `district`, `District`, `District Name`
* **City**: `city`, `City`, `address_city`
* **Type**: `institution_type`, `Institution Type`, `type`, `Type`, `category`, `Category`
* **Affiliation**: `university_affiliation`, `University Affiliation`, `affiliating_university`, `Affiliating University`, `university`, `University`
* **Source**: `source`, `Source`

---

## Step 3: Configure Env Secrets

Ensure your `.env` file at the root of the project contains your project's administrative **Service Role Key** (this is required to write to the `colleges` table under RLS rules):

```env
SUPABASE_URL="https://owthncqhxwuhmaseozgu.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-secret-key"
```

> [!WARNING]
> Never share or commit your `SUPABASE_SERVICE_ROLE_KEY`. It bypasses all Row Level Security constraints.

---

## Step 4: Run the Import Command

Execute the import script using Bun:

```bash
bun run scripts/import-colleges.ts
```

The script will:
1. Parse the `data/india_colleges.csv` file.
2. Normalize all whitespace, letters, and codes.
3. Automatically set search indexes and verification flags.
4. Deduplicate rows based on name, state, and district (merging fields if copies exist).
5. Upsert them in fast database batches of 100.
6. Print a comprehensive statistics audit to the terminal.

---

## Step 5: Verify the Import
You can verify the imported total rows by running the database queries in [supabase/sql/check_college_import.sql](file:///d:/studymate/studymate-ai-75/supabase/sql/check_college_import.sql) using the Supabase SQL Editor.
