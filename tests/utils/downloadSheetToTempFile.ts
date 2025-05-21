import fs from "fs";
import os from "os";
import path from "path";
import https from "https";

/**
 * Download a Google Sheet as CSV to a temporary file
 * @param sheetId Google Sheet ID
 * @param gid Tab GID (found in URL)
 * @returns {Promise<string>} Path to temporary CSV file
 */
export async function downloadSheetToTempFile(sheetId: string, gid: string): Promise<string> {
  // const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  // const tmpFilePath = path.join(os.tmpdir(), `temp-sheet-${Date.now()}.csv`);

  // return new Promise((resolve, reject) => {
  //   const file = fs.createWriteStream(tmpFilePath);
  //   https.get(url, (response) => {
  //     if (response.statusCode !== 200) {
  //       return reject(new Error(`Failed to download: ${response.statusCode}`));
  //     }
  //     response.pipe(file);
  //     file.on("finish", () => file.close(() => resolve(tmpFilePath)));
  //   }).on("error", (err) => reject(err));
  // });
}
