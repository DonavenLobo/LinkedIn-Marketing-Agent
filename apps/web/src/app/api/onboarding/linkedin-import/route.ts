import { NextResponse } from "next/server";
import { getAuthUser, corsHeaders } from "@/lib/auth";
import { unzipSync, strFromU8 } from "fflate";
import type { LinkedInImportData, LinkedInPosition } from "@linkedin-agent/shared";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** Parse a simple CSV line handling quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Strip BOM if present
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const headers = parseCsvLine(headerLine).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

function get(row: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    if (row[k]?.trim()) return row[k].trim();
  }
  return null;
}

/** Try to extract title + company from a LinkedIn headline like "ML Engineer @ Ford | GenAI" */
function extractPositionFromHeadline(headline: string): LinkedInPosition | null {
  // Pattern: "Title @ Company" or "Title at Company"
  const atMatch = headline.match(/^(.+?)\s*[@]\s*([^|,]+)/);
  if (atMatch) {
    return { title: atMatch[1].trim(), company: atMatch[2].trim(), description: null };
  }
  const atWordMatch = headline.match(/^(.+?)\s+at\s+([^|,]+)/i);
  if (atWordMatch) {
    return { title: atWordMatch[1].trim(), company: atWordMatch[2].trim(), description: null };
  }
  return null;
}

function parseProfileCsv(text: string): Partial<LinkedInImportData> {
  const rows = parseCsv(text);
  if (!rows.length) return {};
  const row = rows[0];
  const headline = get(row, "Headline", "LinkedIn Headline");
  // Extract position from headline as fallback when no Positions.csv is available
  const inferredPositions: LinkedInPosition[] = [];
  if (headline) {
    const pos = extractPositionFromHeadline(headline);
    if (pos) inferredPositions.push(pos);
  }
  return {
    firstName: get(row, "First Name", "FirstName"),
    lastName: get(row, "Last Name", "LastName"),
    headline,
    summary: get(row, "Summary", "About"),
    industry: get(row, "Industry"),
    positions: inferredPositions,
  };
}

function parsePositionsCsv(text: string): LinkedInPosition[] {
  const rows = parseCsv(text);
  return rows
    .filter((r) => get(r, "Company Name", "Company"))
    .map((r) => ({
      title: get(r, "Title", "Position Title") || "",
      company: get(r, "Company Name", "Company") || "",
      description: get(r, "Description"),
    }))
    .slice(0, 5);
}

function parseSkillsCsv(text: string): string[] {
  const rows = parseCsv(text);
  return rows
    .map((r) => get(r, "Name", "Skill Name") || "")
    .filter(Boolean)
    .slice(0, 20);
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers: corsHeaders });
    }

    const buffer = await file.arrayBuffer();
    const importData: LinkedInImportData = {
      firstName: null,
      lastName: null,
      headline: null,
      summary: null,
      industry: null,
      positions: [],
      skills: [],
    };
    const fieldsFound: string[] = [];

    const filename = file.name.toLowerCase();

    if (filename.endsWith(".zip")) {
      // Use fflate to decompress — handles all ZIP variants correctly
      const uint8 = new Uint8Array(buffer);
      const decompressed = unzipSync(uint8);

      // Normalize filenames to lowercase for matching
      const files: Record<string, string> = {};
      for (const [name, data] of Object.entries(decompressed)) {
        files[name.toLowerCase()] = strFromU8(data);
      }

      // Try to find the CSVs — LinkedIn may nest them in a folder
      const findFile = (...names: string[]) => {
        for (const [path, content] of Object.entries(files)) {
          for (const name of names) {
            if (path.endsWith(name)) return content;
          }
        }
        return null;
      };

      const profileText = findFile("profile.csv");
      if (profileText) {
        const profileData = parseProfileCsv(profileText);
        Object.assign(importData, profileData);
        if (profileData.headline) fieldsFound.push("headline");
        if (profileData.industry) fieldsFound.push("industry");
        if (profileData.firstName || profileData.lastName) fieldsFound.push("name");
        if (profileData.summary) fieldsFound.push("summary");
        if (profileData.positions?.length) fieldsFound.push(`current role (from headline)`);
      }

      const positionsText = findFile("positions.csv");
      if (positionsText) {
        // Full positions CSV overrides any headline-inferred position
        importData.positions = parsePositionsCsv(positionsText);
        if (importData.positions.length) fieldsFound.push(`${importData.positions.length} position${importData.positions.length > 1 ? "s" : ""}`);
      }

      const skillsText = findFile("skills.csv");
      if (skillsText) {
        importData.skills = parseSkillsCsv(skillsText);
        if (importData.skills.length) fieldsFound.push(`${importData.skills.length} skill${importData.skills.length > 1 ? "s" : ""}`);
      }
    } else {
      // Single CSV — auto-detect type by header
      const text = new TextDecoder().decode(buffer);
      const rows = parseCsv(text);
      if (!rows.length) {
        return NextResponse.json({ error: "Could not parse CSV — file appears empty." }, { status: 400, headers: corsHeaders });
      }
      const firstRow = rows[0];
      const keys = Object.keys(firstRow).map((k) => k.toLowerCase());

      if (keys.some((k) => k.includes("headline") || k.includes("first name"))) {
        const profileData = parseProfileCsv(text);
        Object.assign(importData, profileData);
        if (profileData.headline) fieldsFound.push("headline");
        if (profileData.industry) fieldsFound.push("industry");
        if (profileData.firstName || profileData.lastName) fieldsFound.push("name");
      } else if (keys.some((k) => k.includes("company"))) {
        importData.positions = parsePositionsCsv(text);
        if (importData.positions.length) fieldsFound.push(`${importData.positions.length} positions`);
      } else if (keys.some((k) => k.includes("name") || k.includes("skill"))) {
        importData.skills = parseSkillsCsv(text);
        if (importData.skills.length) fieldsFound.push(`${importData.skills.length} skills`);
      }
    }

    if (!fieldsFound.length) {
      return NextResponse.json(
        { error: "No recognizable LinkedIn data found. Make sure you're uploading a LinkedIn data export ZIP or Profile/Positions/Skills CSV." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Save to user_profiles
    await supabase
      .from("user_profiles")
      .update({ linkedin_import_data: importData, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    // Also update active in_progress session if one exists
    const { data: activeSession } = await supabase
      .from("onboarding_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .limit(1)
      .maybeSingle();

    if (activeSession) {
      await supabase
        .from("onboarding_sessions")
        .update({ linkedin_import: importData, updated_at: new Date().toISOString() })
        .eq("id", activeSession.id);
    }

    return NextResponse.json({ importedData: importData, fieldsFound }, { headers: corsHeaders });
  } catch (err) {
    console.error("LinkedIn import error:", err);
    return NextResponse.json(
      { error: "Failed to parse LinkedIn export. Please make sure you're uploading the ZIP file from LinkedIn's data export." },
      { status: 500, headers: corsHeaders }
    );
  }
}
