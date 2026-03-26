import fs from 'fs';
import path from 'path';
import { db, initDb } from './db.js';

async function audit() {
  await initDb();
  
  const publicImagesDir = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(publicImagesDir)) {
    console.error('Public images directory not found:', publicImagesDir);
    process.exit(1);
  }

  const actualFiles = fs.readdirSync(publicImagesDir);
  const actualFilesLower = actualFiles.map(f => f.toLowerCase());

  db.all('SELECT id, name, image_url FROM products', [], (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    const report = [];

    for (const row of rows) {
      const url = row.image_url;
      if (!url) {
        report.push({ id: row.id, name: row.name, issue: 'Empty image_url' });
        continue;
      }

      if (url.startsWith('http')) continue;

      // Extract filename, handle potential URL encoding like %20
      let filename = url.split('/').pop();
      try {
        filename = decodeURIComponent(filename);
      } catch (e) {}

      if (!actualFiles.includes(filename)) {
        const lowerMatch = actualFiles.find(f => f.toLowerCase() === filename.toLowerCase());
        if (lowerMatch) {
          report.push({
            id: row.id,
            name: row.name,
            issue: 'Case mismatch',
            dbValue: filename,
            actualFile: lowerMatch
          });
        } else {
          report.push({
            id: row.id,
            name: row.name,
            issue: 'File not found',
            dbValue: filename,
            possibleMatches: actualFiles.filter(f => f.toLowerCase().includes(filename.toLowerCase().substring(0, 5)))
          });
        }
      }
    }

    let out = `--- Audit Result ---\n`;
    out += `Total DB Rows: ${rows.length}\n`;
    out += `Actual Files in public/images: ${actualFiles.length}\n\n`;

    let issuesCount = 0;
    for (const issue of report) {
      issuesCount++;
      if (issue.issue === 'Case mismatch') {
        out += `[!] CASE MISMATCH: "${issue.name}" (ID: ${issue.id})\n`;
        out += `    DB says: ${issue.dbValue}\n`;
        out += `    Actual:  ${issue.actualFile}\n\n`;
      } else if (issue.issue === 'File not found') {
        out += `[X] NOT FOUND: "${issue.name}" (ID: ${issue.id})\n`;
        out += `    DB says: ${issue.dbValue}\n`;
        out += `    Matches: ${issue.possibleMatches.join(', ') || 'None'}\n\n`;
      } else {
        out += `[-] ISSUE: "${issue.name}" (ID: ${issue.id}) - ${issue.issue}\n\n`;
      }
    }

    out += `Total Issues Found: ${issuesCount}\n`;
    fs.writeFileSync('audit_results.txt', out);
    console.log('Audit complete. Results written to audit_results.txt');
    // No process.exit(0) to avoid assertion race
  });
}

audit().catch(console.error);
