// functions/api/tryon.js
// Cloudflare Pages Function for fal-ai/cat-vton Virtual Try-On

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Retrieve FAL API Key from Cloudflare Pages Environment Variables
  const FAL_KEY = env.FAL_KEY || env.FAL_API_KEY;

  if (!FAL_KEY) {
    return new Response(
      JSON.stringify({
        error: "FAL_KEY is not configured. Please set FAL_KEY in your Cloudflare Pages dashboard or .dev.vars file.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { human_image, garment_image, cloth_type = "overall" } = body;

    if (!human_image || !garment_image) {
      return new Response(
        JSON.stringify({ error: "Both human_image and garment_image are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Format images as URLs or Data URIs accepted by fal.ai
    const formatImage = (img) => {
      if (typeof img !== "string") return img;
      if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) {
        return img;
      }
      return `data:image/webp;base64,${img}`;
    };

    const humanImageUrl = formatImage(human_image);
    const garmentImageUrl = formatImage(garment_image);

    // 3. Call fal-ai/cat-vton synchronous endpoint
    const falResponse = await fetch("https://fal.run/fal-ai/cat-vton", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        human_image_url: humanImageUrl,
        garment_image_url: garmentImageUrl,
        cloth_type: cloth_type, // 'upper' | 'lower' | 'overall'
      }),
    });

    const falData = await falResponse.json();

    if (!falResponse.ok) {
      return new Response(
        JSON.stringify({
          error: falData.detail || falData.message || "fal.ai Cat-VTON inference failed",
        }),
        { status: falResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Extract generated image URL
    // fal-ai/cat-vton returns: { image: { url: "https://v3.fal.media/...", ... } }
    const resultImageUrl = falData.image?.url || falData.images?.[0]?.url;

    if (!resultImageUrl) {
      return new Response(
        JSON.stringify({ error: "No image URL returned by fal-ai/cat-vton." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        image_url: resultImageUrl,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
