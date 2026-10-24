// functions/api/tryon.js
// Cloudflare Pages Function using google/nano-banana-lite/edit

const PRODUCTION_TRY_ON_PROMPT = `TASK: Virtual Clothing Replacement.
Apply the exact suit/clothing from Image 2 onto the person in Image 1.

CRITICAL PRESERVATION DIRECTIVES (DO NOT MODIFY):
1. CAMERA & PERSPECTIVE: The camera angle, shot framing, field of view, and distance must remain 100% IDENTICAL to Image 1. Do NOT rotate, tilt, pan, or zoom the camera.
2. BODY POSE & POSTURE: The person's physical pose, body orientation, spine alignment, shoulder angle, head tilt, and the exact position of hands, arms, and legs must remain 100% FROZEN and UNCHANGED from Image 1.
3. IDENTITY & FACE: The person's face, facial expression, eyes, skin tone, hair, head shape, and neck must remain 100% UNTOUCHED and identical to Image 1.
4. BACKGROUND & LIGHTING: The entire environment, background setting, shadows, lighting direction, and color temperature must remain 100% UNCHANGED from Image 1.

CLOTHING REPLACEMENT ONLY:
- Remove only the current clothing worn by the person in Image 1.
- Accurately recreate the exact suit/outfit, colors, patterns, and fabric texture from Image 2 onto the person's body.
- The new outfit must naturally conform and drape over the person's existing pose, creating realistic folds, collars, and seams matching the lighting of Image 1.
- Seamless, photorealistic blending at the neck, wrists, and waistline.`;

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
    const { human_image, garment_image } = body;

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
        prompt: PRODUCTION_TRY_ON_PROMPT,
        image_urls: [humanImageUrl, garmentImageUrl],
        num_images: 1,
        aspect_ratio: "auto",
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: data.detail || data.message || "Styling engine failed. Please try again.",
        }),
        { status: apiResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

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
