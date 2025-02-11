import { NextApiRequest } from 'next';
import EdgeGrid from 'akamai-edgegrid';

async function fetchBucketing(environmentId: string): Promise<object> {
  try {
    const response = await fetch(
      `https://cdn.flagship.io/${environmentId}/bucketing.json`,
      { cache: 'no-cache' },
    );

    const bucketing = await response.json();

    return bucketing;
  } catch (error) {
    throw new Error(
      `Failed to fetch bucketing file for '${environmentId}' environment. Error: ${(error as any).message}`,
    );
  }
}

export async function syncPersonalisation(
  request: NextApiRequest,
): Promise<string[]> {
  const {
    host,
    client_token: clientToken,
    client_secret: clientSecret,
    access_token: accessToken,
    environment_name: environmentName,
    environment_id: environmentId,
    api_key: apiKey,
  } = request.body;

  console.log({ request });

  const edgeGrid = new EdgeGrid(clientToken, clientSecret, accessToken, host);
  const bucketing = await fetchBucketing(environmentId);

  const updateEntry = ({ key, value }: { key: string; value: string }) => {
    return new Promise<string>((resolve, reject) => {
      const startTime = performance.now();
      const path = `/edgekv/v1/networks/production/namespaces/abtasty/groups/${environmentName}/items/${key}`;

      edgeGrid.auth({
        method: 'PUT',
        headers: {},
        path,
        body: value,
      });

      edgeGrid.send((error, _, body) => {
        if (error) {
          const errorMessage = `Failed to set '${key}' key in '${environmentName}' group. Error: ${error.message}`;
          reject(new Error(errorMessage));
        }

        resolve(body as string);
      });
    });
  };

  const entries = [
    { key: 'bucketing', value: bucketing },
    { key: 'environment-id', value: environmentId },
    { key: 'api-key', value: apiKey },
  ];

  return Promise.all(entries.map(updateEntry));
}

export async function POST(request: NextApiRequest) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed');
  }

  try {
    const result = await syncPersonalisation(request);
    return new Response("Success");
  } catch (error) {
    return new Response((error as any).message);
  }
}
