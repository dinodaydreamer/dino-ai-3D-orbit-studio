import { GoogleGenAI } from "@google/genai";
import { Resolution, AspectRatio } from "../types";

/**
 * Normalizes an angle to the -180 to 180 range.
 */
const normalizeAngle = (angle: number): number => {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
};

/**
 * Calculates the descriptive strings for camera angles and styles.
 */
export const getCameraParams = (
  rawAzimuth: number,
  rawElevation: number,
  rawRoll: number,
  zoom: number,
  shotType: string
) => {
  // Normalize angles
  const azimuth = normalizeAngle(rawAzimuth);
  const elevation = Math.max(-90, Math.min(90, rawElevation)); // Clamp elevation
  const roll = normalizeAngle(rawRoll);

  // --- Horizontal Logic ---
  const absAzimuth = Math.abs(azimuth);
  const hDirection = azimuth > 0 ? "right" : "left";
  
  let hContext = "";
  if (absAzimuth < 10) hContext = "Front view";
  else if (absAzimuth > 170) hContext = "Back view (Rear view)";
  else if (Math.abs(absAzimuth - 90) < 10) hContext = `${hDirection} profile view (Side view)`;
  else if (absAzimuth > 90) hContext = `Back-${hDirection} (Rear 3/4 view)`;
  else hContext = `Front-${hDirection} (Front 3/4 view)`;

  // --- Vertical Logic ---
  let vContext = "";
  const absElev = Math.abs(elevation);
  
  if (absElev < 10) {
    vContext = "Eye-level view";
  } else if (elevation > 0) {
    // Positive elevation = Camera goes UP, looking DOWN (Top view)
    if (elevation > 60) vContext = "Direct top-down view (Bird's eye view)";
    else if (elevation > 25) vContext = "High angle view (Looking down from above)";
    else vContext = "Slightly high angle";
  } else {
    // Negative elevation = Camera goes DOWN, looking UP (Bottom view)
    if (elevation < -60) vContext = "Direct bottom-up view (Worm's eye view)";
    else if (elevation < -25) vContext = "Low angle view (Looking up from below)";
    else vContext = "Slightly low angle";
  }

  // --- Roll/Tilt Logic ---
  let rContext = "";
  if (Math.abs(roll) > 2) {
      rContext = `Camera Roll (Tilt): ${roll} degrees. ${roll > 0 ? 'Clockwise' : 'Counter-clockwise'} tilt (Dutch Angle).`;
  }

  // --- Zoom/Distance Logic ---
  let distContext = "Medium shot (Standard distance)";
  if (zoom > 1.8) distContext = "Extreme Close-up (Macro detail)";
  else if (zoom > 1.3) distContext = "Close-up shot (Head and shoulders if person)";
  else if (zoom < 0.6) distContext = "Extreme Long shot (Wide angle, subject small in frame)";
  else if (zoom < 0.85) distContext = "Long shot (Full body visible)";

  // --- Shot Type Logic ---
  let styleInstruction = "";
  if (shotType === "Dutch Angle" || Math.abs(roll) > 10) {
    styleInstruction = "Apply a Dutch Angle (Canted Angle). Tilt the camera horizon significantly to create tension or disorientation.";
  } else if (shotType === "POV Shot") {
    styleInstruction = "Render this as a First-Person Point of View (POV) shot. Make it feel like the viewer is looking through their own eyes at the object.";
  } else if (shotType === "Over-the-Shoulder Shot") {
    styleInstruction = "Composition: Over-the-Shoulder (OTS) shot. Frame the subject past a blurry foreground element (like a shoulder or object edge) to create depth.";
  } else if (shotType === "Drone View") {
    styleInstruction = "Aerial Drone Shot (Flycam) from extreme high altitude. Ultra-wide field of view showing the subject small within a vast environment. Epic scale, looking down from the sky.";
  } else if (shotType === "Face Close-up") {
    styleInstruction = "Portrait Close-up. Focus strictly on the face/head of the character. Shallow depth of field (Bokeh) background. High detail on facial features.";
  } else if (shotType === "Fisheye") {
    styleInstruction = "Fisheye Lens Effect. Use an ultra-wide lens with strong barrel distortion. Curvilinear perspective.";
  } else if (shotType === "Macro") {
    styleInstruction = "Macro Photography. Extreme close-up focusing on texture and material details. Very shallow depth of field.";
  } else if (shotType === "Isometric") {
    styleInstruction = "Isometric Projection. 3D technical view with parallel lines and no perspective convergence. Game art style.";
  } else if (shotType === "Panorama") {
    styleInstruction = "Panoramic View. Wide aspect ratio composition, capturing the full width of the subject and environment.";
  }

  return {
    azimuth, elevation, roll, hDirection,
    hContext, vContext, rContext, distContext, styleInstruction
  };
};

/**
 * Generates a rotated view of the image.
 */
export const generateRotatedView = async (
  apiKey: string,
  base64Image: string,
  rawAzimuth: number,
  rawElevation: number,
  rawRoll: number,
  zoom: number = 1,
  resolution: Resolution = '1K',
  aspectRatio: AspectRatio = '1:1',
  shotType: string = ''
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  if (!base64Image) throw new Error("No image provided");

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const params = getCameraParams(rawAzimuth, rawElevation, rawRoll, zoom, shotType);

  const prompt = `
    Novel View Synthesis Task.
    Input: An image of an object.
    
    Target Transformation:
    1. Rotate camera ${Math.abs(params.azimuth)} degrees to the ${params.hDirection} around the object.
    2. Move camera ${params.vContext.toLowerCase()}.
    3. ${params.rContext ? params.rContext : 'Keep horizon level (0 degrees roll).'}
    4. Camera Distance: ${params.distContext}.
    5. Aspect Ratio: ${aspectRatio}.
    ${params.styleInstruction ? `6. Special Cinematic Style: ${params.styleInstruction}` : ''}
    
    Target View Description:
    - Horizontal: ${params.hContext}
    - Vertical: ${params.vContext}
    - Roll: ${params.rContext || "Level"}
    - Distance: ${params.distContext}
    ${shotType ? `- Shot Type: ${shotType}` : ''}
    - Combined: A ${shotType || params.distContext}, ${params.vContext} from the ${params.hContext} perspective${params.rContext ? ' with a canted angle' : ''}.

    Instructions:
    - Maintain the exact identity, structure, colors, and materials of the subject.
    - Hallucinate 3D geometry logically for unseen angles (back/sides/top/bottom).
    - If looking from the top, show the top surface. If from the bottom, show the underside.
    - If a roll/tilt is requested, ensure the horizon line is tilted accordingly.
    - Keep the background neutral or consistent with the input.
    - Output: A high-quality photorealistic image of the object from this precise 3D angle.
  `;

  // Model Selection
  const modelName = resolution === '1K' 
    ? 'gemini-2.5-flash-image' 
    : 'gemini-3-pro-image-preview';

  const config: any = {
      imageConfig: {
          aspectRatio: aspectRatio 
      }
  };
  
  if (resolution !== '1K') {
      config.imageConfig.imageSize = resolution; 
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: cleanBase64 } }
        ]
      },
      config: config
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }

    throw new Error("No image data returned from the model.");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

/**
 * Generates a text prompt describing the image from the specified angle.
 * Uses Gemini Flash for text generation.
 */
export const generateCinematicPrompt = async (
    apiKey: string,
    base64Image: string,
    rawAzimuth: number,
    rawElevation: number,
    rawRoll: number,
    zoom: number = 1,
    shotType: string = ''
  ): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing");
    if (!base64Image) throw new Error("No image provided");
  
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    
    const params = getCameraParams(rawAzimuth, rawElevation, rawRoll, zoom, shotType);
  
    // We want the AI to analyze the image content AND apply our camera settings to the description
    const prompt = `
      You are an expert AI Art Prompter.
      
      Task:
      1. Analyze the content of the provided image (Subject, Appearance, Clothing, Action, Lighting, Environment).
      2. Construct a detailed text-to-image prompt for this subject, BUT describe it as if seen from the following specific camera angle:
      
      CAMERA SETTINGS:
      - Angle: ${params.hContext} and ${params.vContext}
      - Distance: ${params.distContext}
      - Tilt/Roll: ${params.rContext || "Level horizon"}
      - Cinematic Style: ${params.styleInstruction || "Standard cinematic lighting"}
      
      OUTPUT FORMAT:
      Return ONLY the prompt string. Do not add markdown or explanations.
      
      The prompt should follow this structure:
      "[Camera View/Shot Type] of [Detailed Subject Description], [Action/Pose], [Environment/Lighting], [Technical Camera Details]"
      
      Example:
      "A high-angle bird's eye view of a cyberpunk samurai standing in neon rain, glowing katana in hand, looking up towards the camera, dramatic top-down lighting, 4k, highly detailed."
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/png', data: cleanBase64 } }
          ]
        }
      });
  
      return response.text?.trim() || "Failed to generate prompt.";
  
    } catch (error) {
      console.error("Prompt Generation Error:", error);
      throw error;
    }
  };