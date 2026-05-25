const RESIZE = 128;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

function getImageData(image) {
  const canvas = document.createElement("canvas");
  canvas.width = RESIZE;
  canvas.height = RESIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, RESIZE, RESIZE);

  const scale = Math.min(RESIZE / image.width, RESIZE / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (RESIZE - drawWidth) / 2;
  const offsetY = (RESIZE - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  return ctx.getImageData(0, 0, RESIZE, RESIZE).data;
}

function computeColorSimilarity(refData, targetData) {
  let totalDiff = 0;
  const channelCount = RESIZE * RESIZE * 3;

  for (let i = 0; i < refData.length; i += 4) {
    totalDiff += Math.abs(refData[i] - targetData[i]);
    totalDiff += Math.abs(refData[i + 1] - targetData[i + 1]);
    totalDiff += Math.abs(refData[i + 2] - targetData[i + 2]);
  }

  const avgDiff = totalDiff / channelCount;
  return 1 - avgDiff / 255;
}

function grayscaleAt(data, index) {
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

function computeShapeSimilarity(refData, targetData) {
  let matchedEdges = 0;
  let totalEdges = 0;

  for (let y = 1; y < RESIZE - 1; y += 1) {
    for (let x = 1; x < RESIZE - 1; x += 1) {
      const idx = (y * RESIZE + x) * 4;
      const right = (y * RESIZE + (x + 1)) * 4;
      const down = ((y + 1) * RESIZE + x) * 4;

      const refEdge =
        Math.abs(grayscaleAt(refData, idx) - grayscaleAt(refData, right)) +
        Math.abs(grayscaleAt(refData, idx) - grayscaleAt(refData, down));

      const targetEdge =
        Math.abs(grayscaleAt(targetData, idx) - grayscaleAt(targetData, right)) +
        Math.abs(grayscaleAt(targetData, idx) - grayscaleAt(targetData, down));

      if (refEdge > 20 || targetEdge > 20) {
        totalEdges += 1;
        if (Math.abs(refEdge - targetEdge) < 28) {
          matchedEdges += 1;
        }
      }
    }
  }

  if (totalEdges === 0) {
    return 0.5;
  }

  return matchedEdges / totalEdges;
}

export async function calculateSimilarity(referenceSrc, targetSrc) {
  const [referenceImage, targetImage] = await Promise.all([
    loadImage(referenceSrc),
    loadImage(targetSrc)
  ]);

  const referenceData = getImageData(referenceImage);
  const targetData = getImageData(targetImage);

  const colorSimilarity = computeColorSimilarity(referenceData, targetData);
  const shapeSimilarity = computeShapeSimilarity(referenceData, targetData);

  const weighted = colorSimilarity * 0.55 + shapeSimilarity * 0.45;
  return clamp(Math.round(weighted * 1000) / 10, 0, 100);
}
