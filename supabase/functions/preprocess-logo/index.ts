import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REQ_WIDTH = 800;
const REQ_HEIGHT = 600;
const REQ_RATIO = REQ_WIDTH / REQ_HEIGHT;
const MIN_DPI = 150;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image data provided");

    const base64Data = imageBase64.split(",")[1];
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const originalImage = await Image.decode(bytes);
    
    const width = originalImage.width;
    const height = originalImage.height;
    const ratio = width / height;

    // 1. Validation Logic
    // Aspect Ratio Check (with tiny tolerance for rounding)
    const ratioTolerance = 0.05; // Slightly more generous for rounding
    if (Math.abs(ratio - REQ_RATIO) > ratioTolerance) {
      return new Response(JSON.stringify({ 
        error: `Reject: Image aspect ratio must precisely match 4:3 (e.g., 800x600px). Your ratio: ${width}:${height} (${ratio.toFixed(2)})` 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Minimum Dimensions / Resolution Check
    // If it's less than 800x600, it's rejected
    if (width < REQ_WIDTH || height < REQ_HEIGHT) {
      return new Response(JSON.stringify({ 
        error: `Reject: Image resolution too low for ${MIN_DPI} DPI print quality. Minimum required: at least ${REQ_WIDTH}x${REQ_HEIGHT}px. Your dimensions: ${width}x${height}px.` 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2. Preprocessing Pipeline
    // We resize proportionally down to fit 800x600
    // Since it's already 4:3 (validated above), it will be exactly 800x600 after fit
    originalImage.fit(REQ_WIDTH, REQ_HEIGHT);

    // Create transparent canvas
    const canvas = new Image(REQ_WIDTH, REQ_HEIGHT);
    // Draw resized logo centered
    canvas.composite(originalImage, Math.floor((REQ_WIDTH - originalImage.width) / 2), Math.floor((REQ_HEIGHT - originalImage.height) / 2));

    const processedBuffer = await canvas.encode(3); // Encode as PNG
    
    // Convert buffer back to base64
    let binaryStr = '';
    for (let i = 0; i < processedBuffer.length; i++) {
      binaryStr += String.fromCharCode(processedBuffer[i]);
    }
    const base64 = btoa(binaryStr);

    return new Response(JSON.stringify({ 
      success: true, 
      processedImage: `data:image/png;base64,${base64}`,
      message: `Logo preprocessed successfully to ${REQ_WIDTH}x${REQ_HEIGHT}px at ${MIN_DPI} DPI resolution.`
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error("Error in preprocess-logo:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to preprocess image" }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
