import { Hono } from "hono";
import { getDB } from "../db/index";
import { submissions } from "../db/schema";
import type { Context } from "hono";
import { fetchGoogleFormData } from "../utils/googleSheets";
import { eq } from "drizzle-orm";
import stringSimilarity from "string-similarity";

const newsRouter = new Hono();
const DEFAULT_IMAGE = "https://drive.google.com/uc?export=view&id=1qerpdjkg-yedBZTOLYT4jxmT4zZbiVLG";

// Define the structure of Sightengine API response
interface SightengineResponse {
  status: string;
  request?: {
    id: string;
    timestamp: number;
    operations: number;
  };
  nudity?: {
    none?: number;
    sexual_activity?: number;
    sexual_display?: number;
    erotica?: number;
    very_suggestive?: number;
    suggestive?: number;
    mildly_suggestive?: number;
  };
  weapon?: { prob?: number };
  recreational_drug?: { prob?: number };
  medical?: { prob?: number };
  gore?: { prob?: number };
  violence?: { prob?: number };
  error?: {
    type: string;
    code: number;
    message: string;
  };
}

// Function to get a direct Google Drive URL that avoids redirects
const getDirectDriveUrl = (driveLink: string): string | null => {
  // console.log(driveLink);
  
  let match = driveLink.match(/(?:id=|\/d\/)([^/?]+)/);
  // console.log(match);
  // if(match)console.log(`https://drive.usercontent.google.com/download?id=${match[1]}`);
  
  return match ? `https://drive.usercontent.google.com/download?id=${match[1]}` : null;
};
const convertDriveUrl = (url: string) => {
  const match = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
};

const isImageSafe = async (imageUrl: string | null, c: Context): Promise<boolean> => {
  if (!imageUrl) {
    console.error("Image URL is null or invalid.");
    return false;
  }

  const apiUser = c.env.SIGHTENGINE_API_USER;
  const apiSecret = c.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    console.error("Sightengine API credentials are missing.");
    return false;
  }

  // Convert Google Drive link to direct URL
  const directUrl = getDirectDriveUrl(imageUrl);
  if (!directUrl) {
    console.error("Invalid Google Drive link:", imageUrl);
    return false;
  }

  try {
    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        url: directUrl,
        models: "nudity-2.1,weapon,recreational_drug,medical,gore-2.0,violence",
        api_user: apiUser,
        api_secret: apiSecret,
      }),
    });

    const result: SightengineResponse = await response.json();
    // console.log(result);
    
    if (result.status !== "success" || result.error) {
      console.error("Sightengine API Error:", result.error?.message ?? "Unknown error.");
      return false;
    }

    // Check if image is safe
    return (
      (result.nudity?.none ?? 0) > 0.8 &&
      (result.weapon?.prob ?? 0) < 0.05 &&
      (result.recreational_drug?.prob ?? 0) < 0.05 &&
      (result.medical?.prob ?? 0) < 0.05 &&
      (result.gore?.prob ?? 0) < 0.05 &&
      (result.violence?.prob ?? 0) < 0.05
    );
  } catch (error) {
    console.error("Error checking image safety:", error instanceof Error ? error.message : error);
    return false;
  }
};

newsRouter.get('/proxy-image/:id', async (c: Context) => {
  const GOOGLE_API_KEY = c.env.GOOGLE_API_KEY
  const fileId = c.req.param('id');
  console.log(GOOGLE_API_KEY);
  
  const imageUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_API_KEY}`;
  return c.redirect(imageUrl);
});


// Fetch news from DB
newsRouter.get("/", async (c) => {
  const db = getDB(c);
  const news = await db.select().from(submissions);

  const formattedNews = news.map((item) => {
    const createdAt = item.createdAt ? new Date(item.createdAt) : new Date(); // Fallback to current date if null

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      location: item.location,
      author: item.name,
      photo: item.imageUrl
        ? item.imageUrl.startsWith("https://drive.google.com/open?id=")
          ? item.imageUrl.replace("https://drive.google.com/open?id=", "https://drive.google.com/uc?export=view&id=")
          : item.imageUrl
        : "https://drive.usercontent.google.com/download?id=1qerpdjkg-yedBZTOLYT4jxmT4zZbiVLG", // Default image
      date: createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      time: createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      updatedAt: item.createdAt ?? new Date().toISOString(), // Use current timestamp if null
    };
  });

  return c.json(formattedNews);
});


// Sync Google Form Data
newsRouter.get("/sync-google-form", async (c: Context) => {
  const sheetId = c.env.GOOGLE_SHEET_ID;
  const apiKey = c.env.GOOGLE_API_KEY;
  const range = "Form responses 1";

  try {
    const formData = await fetchGoogleFormData(sheetId, range, apiKey);
    return c.json({ success: true, data: formData });
  } catch (error) {
    const err = error as Error;
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Add News Submission with Image Moderation
newsRouter.post("/add", async (c: Context) => {
  const db = getDB(c);
  const { title, description, location, name, phone, category, imageUrl, eventDate } = await c.req.json();

  // Fetch existing news submissions
  const existingNews = await db.select().from(submissions);

  // Check similarity with existing news
  let isDuplicate = false;
  let similarityScore = 0;
  for (const news of existingNews) {
    const similarity = stringSimilarity.compareTwoStrings(description, news.description);
    if (similarity >= 0.8) {
      isDuplicate = true;
      similarityScore = similarity;
      break;
    }
  }

  if (isDuplicate) {
    return c.json({ success: false, message: "Similar news already exists!", similarityScore }, 409);
  }
  // console.log(imageUrl);
  
  // Process Image URL
  let safeImageUrl = imageUrl ? convertDriveUrl(imageUrl) : convertDriveUrl(DEFAULT_IMAGE);
  if (imageUrl) {
    const isSafe = await isImageSafe(safeImageUrl, c);
    // console.log(isSafe);
    if (!isSafe) safeImageUrl = convertDriveUrl(DEFAULT_IMAGE);
  }

  const formattedEventDate = eventDate ? new Date(eventDate).toISOString().split("T")[0] : null;

  // Insert into DB
  const insertedNews = await db.insert(submissions).values({
    title,
    description,
    location,
    name,
    phone,
    category,
    imageUrl: safeImageUrl,
    eventDate: formattedEventDate,
    isApproved: false,
    isDuplicate: false,
    similarityScore: null,
  });

  return c.json({ success: true, message: "News added successfully!", data: insertedNews });
});

export { newsRouter };
