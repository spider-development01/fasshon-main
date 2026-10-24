// functions/api/tryon.js
// Cloudflare Pages Function using google/nano-banana-lite/edit

const TRY_ON_PROMPT = `Seamlessly edit the first photo by replacing the clothing with the exact suit/dress/garment shown in the second photo.
Strict preservation instructions:
- Keep the person's face, facial expression, hair, and head 100% unchanged.
- Keep the body pose, posture, and natural body proportions unchanged.
- Keep the entire background, lighting, and environment unchanged.
- Perfectly fit and drape the reference clothing onto the person with realistic fabric folds, shadows, and textures.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  const FAL_KEY = env.FAL_KEY || env.FAL_API_KEY;

  if (!FAL_KEY) {
    return new Response(
      JSON.stringify({
        error: "FAL_KEY is not configured in Cloudflare Pages environment variables.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { human_image, garment_image, prompt } = body;

    if (!human_image || !garment_image) {
      return new Response(
        JSON.stringify({ error: "Both user photo and garment photo are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const formatImage = (img) => {
      if (typeof img !== "string") return img;
      if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) {
        return img;
      }
      return `data:image/webp;base64,${img}`;
    };

    const humanImageUrl = formatImage(human_image);
    const garmentImageUrl = formatImage(garment_image);

    // Call google/nano-banana-lite/edit on fal.run
    const apiResponse = await fetch("https://fal.run/google/nano-banana-lite/edit", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt || TRY_ON_PROMPT,
        image_urls: [humanImageUrl, garmentImageUrl],
        num_images: 1,
        aspect_ratio: "auto",
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: data.detail || data.message || "Image styling failed. Please try again.",
        }),
        { status: apiResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract the generated image URL
    const resultImageUrl = data.images?.[0]?.url || data.image?.url;

    if (!resultImageUrl) {
      return new Response(
        JSON.stringify({ error: "No image was returned from the styling engine." }),
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
