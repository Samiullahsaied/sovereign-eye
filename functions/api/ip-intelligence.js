export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const body = await request.json();
    const ip = body.ip;

    if (!ip) {
      return Response.json(
        { error: "IP address is required" },
        { status: 400 }
      );
    }

    const apiKey = env.BRIGHTDATA_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "BRIGHTDATA_API_KEY not configured" },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Bright Data endpoint ready",
      ip,
      source: "brightdata"
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message
      },
      { status: 500 }
    );
  }
}
