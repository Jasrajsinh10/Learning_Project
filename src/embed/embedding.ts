import { pipeline } from '@xenova/transformers';

let embedder: any = null;
let loadingPromise: Promise<void> | null = null;

export async function loadModel() {
  if (embedder) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    console.log('⏳ Loading embedding model...');
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-mpnet-base-v2'
    );
  })();

  return loadingPromise;
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    await loadModel();
  }

  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });

  // IMPORTANT: ensure it's number[]
  return Array.from(output.data).map(Number);
}