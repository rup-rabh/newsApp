export async function fetchGoogleFormData(sheetId: string, sheetName: string, apiKey: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const jsonData: { values?: string[][] } = await response.json();

  if (!jsonData.values) {
    throw new Error("No data found in the Google Sheet");
  }

  return jsonData.values;
}
