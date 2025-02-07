export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log({ body, request });
  } catch (e) {
    console.log({ request });
  }

  return new Response('Success!', {
    status: 200,
  });
}
