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

  const scale = Math.min(RESIZE / image.width, RESIZE / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (RESIZE - drawWidth) / 2;
  const offsetY = (RESIZE - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  return ctx.getImageData(0, 0, RESIZE, RESIZE).data;
}

function getImageDataWithTransform(image, scaleFactor, shiftX, shiftY, rotationDeg) {
  const canvas = document.createElement("canvas");
  canvas.width = RESIZE;
  canvas.height = RESIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const baseScale = Math.min(RESIZE / image.width, RESIZE / image.height);
  const scale = baseScale * scaleFactor;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const angleRad = (rotationDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(RESIZE / 2 + shiftX, RESIZE / 2 + shiftY);
  ctx.rotate(angleRad);
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();

  return ctx.getImageData(0, 0, RESIZE, RESIZE).data;
}

function buildReferenceMask(refData, alphaThreshold = 14) {
  const pixelCount = refData.length / 4;
  const mask = new Uint8Array(pixelCount);
  let activeCount = 0;

  for (let p = 0; p < pixelCount; p += 1) {
    if (refData[p * 4 + 3] > alphaThreshold) {
      mask[p] = 1;
      activeCount += 1;
    }
  }

  if (activeCount === 0) {
    mask.fill(1);
    activeCount = pixelCount;
  }

  return { mask, activeCount };
}

function computeColorSimilarity(refData, targetData, maskInfo) {
  let diff = 0;
  let channelCount = 0;

  for (let i = 0; i < refData.length; i += 4) {
    const pixelIndex = i / 4;
    if (maskInfo.mask[pixelIndex] !== 1) {
      continue;
    }

    diff += Math.abs(refData[i] - targetData[i]);
    diff += Math.abs(refData[i + 1] - targetData[i + 1]);
    diff += Math.abs(refData[i + 2] - targetData[i + 2]);
    channelCount += 3;
  }

  if (channelCount === 0) {
    return 0.5;
  }

  return 1 - diff / channelCount / 255;
}

function grayscaleAt(data, index) {
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

function computeShapeSimilarity(refData, targetData, maskInfo) {
  let matchedEdges = 0;
  let totalEdges = 0;

  for (let y = 1; y < RESIZE - 1; y += 1) {
    for (let x = 1; x < RESIZE - 1; x += 1) {
      const pixelIndex = y * RESIZE + x;
      const rightPixelIndex = y * RESIZE + x + 1;
      const downPixelIndex = (y + 1) * RESIZE + x;

      if (
        maskInfo.mask[pixelIndex] !== 1 ||
        maskInfo.mask[rightPixelIndex] !== 1 ||
        maskInfo.mask[downPixelIndex] !== 1
      ) {
        continue;
      }

      const idx = pixelIndex * 4;
      const right = rightPixelIndex * 4;
      const down = downPixelIndex * 4;

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

  return totalEdges === 0 ? 0.5 : matchedEdges / totalEdges;
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h,
    s: max === 0 ? 0 : d / max,
    v: max
  };
}

function classifySignatureColor(r, g, b, a) {
  if (a < 14) return "none";
  const { h, s, v } = rgbToHsv(r, g, b);

  if (v < 0.2) return "black";
  if (s < 0.2 && v > 0.72) return "white";
  if (h >= 70 && h <= 170 && s >= 0.2 && v >= 0.15) return "green";
  if (h >= 18 && h <= 70 && s >= 0.25 && v >= 0.22) return "yellowOrange";
  if ((h <= 15 || h >= 345) && s >= 0.25 && v >= 0.22) return "red";
  return "other";
}

function computeColorSignature(data, maskInfo) {
  const counts = {
    black: 0,
    white: 0,
    green: 0,
    yellowOrange: 0,
    red: 0,
    other: 0
  };
  let valid = 0;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    if (maskInfo.mask[pixelIndex] !== 1) {
      continue;
    }

    const category = classifySignatureColor(data[i], data[i + 1], data[i + 2], data[i + 3]);
    if (category === "none") {
      continue;
    }

    counts[category] += 1;
    valid += 1;
  }

  if (valid === 0) {
    return {
      ratios: { black: 0, white: 0, green: 0, yellowOrange: 0, red: 0, other: 1 }
    };
  }

  return {
    ratios: {
      black: counts.black / valid,
      white: counts.white / valid,
      green: counts.green / valid,
      yellowOrange: counts.yellowOrange / valid,
      red: counts.red / valid,
      other: counts.other / valid
    }
  };
}

function computeSignatureSimilarity(referenceSignature, targetSignature) {
  const ref = referenceSignature.ratios;
  const tar = targetSignature.ratios;
  const keys = ["black", "white", "green", "yellowOrange"];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const key of keys) {
    const weight = ref[key] + 0.08;
    const diff = Math.abs(tar[key] - ref[key]);
    const closeness = 1 - Math.min(1, diff / Math.max(0.08, ref[key] + 0.08));
    weightedSum += closeness * weight;
    weightTotal += weight;
  }

  let score = weightTotal === 0 ? 0.5 : weightedSum / weightTotal;
  const redPenalty = Math.min(1, Math.max(0, tar.red - ref.red - 0.02) / 0.22) * 0.55;
  const otherPenalty = Math.min(1, Math.max(0, tar.other - ref.other - 0.08) / 0.35) * 0.25;

  return clamp(score - redPenalty - otherPenalty, 0, 1);
}

function getMaskBounds(maskInfo) {
  let minX = RESIZE;
  let minY = RESIZE;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < RESIZE; y += 1) {
    for (let x = 0; x < RESIZE; x += 1) {
      if (maskInfo.mask[y * RESIZE + x] !== 1) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX > maxX || minY > maxY) {
    return { minX: 0, minY: 0, maxX: RESIZE - 1, maxY: RESIZE - 1 };
  }

  return { minX, minY, maxX, maxY };
}

function resolveRegion(bounds, region) {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;

  return {
    minX: Math.round(bounds.minX + width * region.x1),
    maxX: Math.round(bounds.minX + width * region.x2),
    minY: Math.round(bounds.minY + height * region.y1),
    maxY: Math.round(bounds.minY + height * region.y2)
  };
}

function emptySignature() {
  return {
    ratios: { black: 0, white: 0, green: 0, yellowOrange: 0, red: 0, other: 0 },
    valid: 0
  };
}

function computeRegionSignature(data, maskInfo, bounds, region) {
  const rect = resolveRegion(bounds, region);
  const counts = {
    black: 0,
    white: 0,
    green: 0,
    yellowOrange: 0,
    red: 0,
    other: 0
  };
  let valid = 0;

  for (let y = Math.max(0, rect.minY); y <= Math.min(RESIZE - 1, rect.maxY); y += 1) {
    for (let x = Math.max(0, rect.minX); x <= Math.min(RESIZE - 1, rect.maxX); x += 1) {
      const pixelIndex = y * RESIZE + x;
      if (maskInfo.mask[pixelIndex] !== 1) {
        continue;
      }

      const dataIndex = pixelIndex * 4;
      const category = classifySignatureColor(
        data[dataIndex],
        data[dataIndex + 1],
        data[dataIndex + 2],
        data[dataIndex + 3]
      );

      if (category === "none") {
        continue;
      }

      counts[category] += 1;
      valid += 1;
    }
  }

  if (valid === 0) {
    return emptySignature();
  }

  return {
    ratios: {
      black: counts.black / valid,
      white: counts.white / valid,
      green: counts.green / valid,
      yellowOrange: counts.yellowOrange / valid,
      red: counts.red / valid,
      other: counts.other / valid
    },
    valid
  };
}

function focusedColorScore(referenceSignature, targetSignature, categories, minReferenceRatio = 0.025) {
  const refTotal = categories.reduce((sum, category) => sum + referenceSignature.ratios[category], 0);
  if (referenceSignature.valid < 18 || refTotal < minReferenceRatio) {
    return null;
  }

  const targetTotal = categories.reduce((sum, category) => sum + targetSignature.ratios[category], 0);
  const presence = 1 - Math.min(1, Math.abs(targetTotal - refTotal) / Math.max(0.1, refTotal + 0.05));
  const distribution =
    categories.reduce((sum, category) => {
      const diff = Math.abs(referenceSignature.ratios[category] - targetSignature.ratios[category]);
      return sum + (1 - Math.min(1, diff / Math.max(0.08, referenceSignature.ratios[category] + 0.05)));
    }, 0) / categories.length;

  return clamp((presence * 0.7 + distribution * 0.3) * 100, 0, 100);
}

const PART_REGIONS = [
  {
    key: "head",
    label: "머리",
    region: { x1: 0.2, y1: 0, x2: 0.8, y2: 0.34 },
    categories: ["black"],
    weight: 1.2
  },
  {
    key: "eyes",
    label: "눈",
    region: { x1: 0.27, y1: 0.08, x2: 0.73, y2: 0.32 },
    categories: ["black"],
    weight: 1
  },
  {
    key: "beak",
    label: "부리",
    region: { x1: 0.34, y1: 0.22, x2: 0.66, y2: 0.44 },
    categories: ["yellowOrange"],
    weight: 1.15
  },
  {
    key: "cheeks",
    label: "볼/노란 포인트",
    region: { x1: 0.08, y1: 0.28, x2: 0.92, y2: 0.58 },
    categories: ["yellowOrange"],
    weight: 1.05
  },
  {
    key: "arms",
    label: "팔",
    region: { x1: 0, y1: 0.34, x2: 1, y2: 0.78 },
    categories: ["black"],
    weight: 1.1
  },
  {
    key: "feet",
    label: "발",
    region: { x1: 0.18, y1: 0.78, x2: 0.82, y2: 1 },
    categories: ["black"],
    weight: 0.95
  },
  {
    key: "body",
    label: "배/얼굴 흰색",
    region: { x1: 0.24, y1: 0.2, x2: 0.76, y2: 0.88 },
    categories: ["white"],
    weight: 0.85
  }
];

function computePartColorDetail(refData, targetData, maskInfo) {
  const bounds = getMaskBounds(maskInfo);
  const parts = [];
  let weightedScore = 0;
  let weightTotal = 0;

  for (const part of PART_REGIONS) {
    const referenceSignature = computeRegionSignature(refData, maskInfo, bounds, part.region);
    const targetSignature = computeRegionSignature(targetData, maskInfo, bounds, part.region);
    const score = focusedColorScore(referenceSignature, targetSignature, part.categories);

    if (score === null) {
      continue;
    }

    parts.push({
      key: part.key,
      label: part.label,
      score: Math.round(score * 10) / 10
    });
    weightedScore += score * part.weight;
    weightTotal += part.weight;
  }

  if (weightTotal === 0) {
    return { score: 50, parts: [] };
  }

  return {
    score: Math.round((weightedScore / weightTotal) * 10) / 10,
    parts
  };
}

function categoryMatches(data, index, category) {
  return classifySignatureColor(data[index], data[index + 1], data[index + 2], data[index + 3]) === category;
}

function computeCategoryBox(data, maskInfo, bounds, region, category) {
  const rect = resolveRegion(bounds, region);
  let minX = RESIZE;
  let minY = RESIZE;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = Math.max(0, rect.minY); y <= Math.min(RESIZE - 1, rect.maxY); y += 1) {
    for (let x = Math.max(0, rect.minX); x <= Math.min(RESIZE - 1, rect.maxX); x += 1) {
      const pixelIndex = y * RESIZE + x;
      if (maskInfo.mask[pixelIndex] !== 1) {
        continue;
      }

      const dataIndex = pixelIndex * 4;
      if (!categoryMatches(data, dataIndex, category)) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      count += 1;
    }
  }

  return count === 0 ? null : { minX, minY, maxX, maxY, count };
}

function boxSimilarity(referenceBox, targetBox) {
  if (!referenceBox || !targetBox) {
    return 0;
  }

  const refWidth = referenceBox.maxX - referenceBox.minX + 1;
  const refHeight = referenceBox.maxY - referenceBox.minY + 1;
  const targetWidth = targetBox.maxX - targetBox.minX + 1;
  const targetHeight = targetBox.maxY - targetBox.minY + 1;
  const refCenterX = (referenceBox.minX + referenceBox.maxX) / 2;
  const refCenterY = (referenceBox.minY + referenceBox.maxY) / 2;
  const targetCenterX = (targetBox.minX + targetBox.maxX) / 2;
  const targetCenterY = (targetBox.minY + targetBox.maxY) / 2;
  const refAspect = refWidth / Math.max(1, refHeight);
  const targetAspect = targetWidth / Math.max(1, targetHeight);
  const widthScore = 1 - Math.min(1, Math.abs(refWidth - targetWidth) / Math.max(refWidth, targetWidth, 1));
  const heightScore = 1 - Math.min(1, Math.abs(refHeight - targetHeight) / Math.max(refHeight, targetHeight, 1));
  const centerDistance = Math.hypot(refCenterX - targetCenterX, refCenterY - targetCenterY);
  const centerScore = 1 - Math.min(1, centerDistance / 36);
  const aspectScore = 1 - Math.min(1, Math.abs(refAspect - targetAspect) / Math.max(refAspect, targetAspect, 0.1));

  return clamp((widthScore * 0.25 + heightScore * 0.25 + centerScore * 0.25 + aspectScore * 0.25) * 100, 0, 100);
}

function computeBagDetail(refData, targetData, maskInfo) {
  const bounds = getMaskBounds(maskInfo);
  const bagRegion = { x1: 0.14, y1: 0.36, x2: 0.86, y2: 0.8 };
  const referenceSignature = computeRegionSignature(refData, maskInfo, bounds, bagRegion);
  const targetSignature = computeRegionSignature(targetData, maskInfo, bounds, bagRegion);
  const referenceGreen = referenceSignature.ratios.green;
  const targetGreen = targetSignature.ratios.green;

  if (referenceGreen < 0.018) {
    return { score: 70, presenceScore: 70, shapeScore: 70 };
  }

  const presenceScore =
    (1 - Math.min(1, Math.abs(referenceGreen - targetGreen) / Math.max(0.08, referenceGreen + 0.04))) * 100;
  const referenceBox = computeCategoryBox(refData, maskInfo, bounds, bagRegion, "green");
  const targetBox = computeCategoryBox(targetData, maskInfo, bounds, bagRegion, "green");
  const shapeScore = boxSimilarity(referenceBox, targetBox);

  return {
    score: Math.round((presenceScore * 0.55 + shapeScore * 0.45) * 10) / 10,
    presenceScore: Math.round(presenceScore * 10) / 10,
    shapeScore: Math.round(shapeScore * 10) / 10
  };
}

function computeNonWhiteFeatureBox(data, maskInfo) {
  let minX = RESIZE;
  let minY = RESIZE;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = 0; y < RESIZE; y += 1) {
    for (let x = 0; x < RESIZE; x += 1) {
      const pixelIndex = y * RESIZE + x;
      if (maskInfo.mask[pixelIndex] !== 1) {
        continue;
      }

      const dataIndex = pixelIndex * 4;
      const category = classifySignatureColor(
        data[dataIndex],
        data[dataIndex + 1],
        data[dataIndex + 2],
        data[dataIndex + 3]
      );

      if (category === "none" || category === "white" || category === "other") {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      count += 1;
    }
  }

  return count === 0 ? null : { minX, minY, maxX, maxY, count };
}

function computeProportionDetail(refData, targetData, maskInfo) {
  const score = boxSimilarity(
    computeNonWhiteFeatureBox(refData, maskInfo),
    computeNonWhiteFeatureBox(targetData, maskInfo)
  );

  return {
    score: Math.round(score * 10) / 10
  };
}

function buildSimilarityDetailFromData(refData, targetData, maskInfo, referenceSignature) {
  const globalColor = computeColorSimilarity(refData, targetData, maskInfo);
  const shape = computeShapeSimilarity(refData, targetData, maskInfo);
  const signature = computeSignatureSimilarity(
    referenceSignature,
    computeColorSignature(targetData, maskInfo)
  );
  const signatureScore = signature * 100;
  const partColor = computePartColorDetail(refData, targetData, maskInfo);
  const bag = computeBagDetail(refData, targetData, maskInfo);
  const proportion = computeProportionDetail(refData, targetData, maskInfo);
  const featureScore = bag.score * 0.62 + proportion.score * 0.38;
  const score =
    shape * 100 * 0.35 +
    partColor.score * 0.3 +
    featureScore * 0.25 +
    signatureScore * 0.1;

  return {
    score: Math.round(clamp(score, 0, 100) * 10) / 10,
    colorScore: partColor.score,
    globalColorScore: Math.round(globalColor * 1000) / 10,
    shapeScore: Math.round(shape * 1000) / 10,
    signatureScore: Math.round(signatureScore * 10) / 10,
    featureScore: Math.round(featureScore * 10) / 10,
    bagScore: bag.score,
    proportionScore: proportion.score,
    partScores: partColor.parts
  };
}

async function calculateSimilarityDetail(referenceSrc, targetSrc) {
  const [referenceImage, targetImage] = await Promise.all([
    loadImage(referenceSrc),
    loadImage(targetSrc)
  ]);
  const refData = getImageData(referenceImage);
  const maskInfo = buildReferenceMask(refData);
  const referenceSignature = computeColorSignature(refData, maskInfo);
  const scaleCandidates = [0.92, 1, 1.08];
  const shiftCandidates = [-8, -4, 0, 4, 8];
  const rotationCandidates = [-6, -3, 0, 3, 6];
  let best = null;

  for (const scale of scaleCandidates) {
    for (const shiftX of shiftCandidates) {
      for (const shiftY of shiftCandidates) {
        for (const rotationDeg of rotationCandidates) {
          const targetData = getImageDataWithTransform(targetImage, scale, shiftX, shiftY, rotationDeg);
          const detail = buildSimilarityDetailFromData(
            refData,
            targetData,
            maskInfo,
            referenceSignature
          );
          if (!best || detail.score > best.score) {
            best = detail;
          }
        }
      }
    }
  }

  const baseline = buildSimilarityDetailFromData(
    refData,
    getImageData(targetImage),
    maskInfo,
    referenceSignature
  );
  return !best || baseline.score > best.score ? baseline : best;
}

function extractOpaqueComponents(turnaroundImage) {
  const canvas = document.createElement("canvas");
  canvas.width = turnaroundImage.width;
  canvas.height = turnaroundImage.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(turnaroundImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  const visited = new Uint8Array(width * height);
  const boxes = [];
  const minPixels = Math.max(3000, Math.floor(width * height * 0.0022));
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);

  function alphaAt(x, y) {
    return data[(y * width + x) * 4 + 3];
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIdx = y * width + x;
      if (visited[startIdx] || alphaAt(x, y) < 14) {
        continue;
      }

      let head = 0;
      let tail = 0;
      visited[startIdx] = 1;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head += 1;
        count += 1;

        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }

            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              continue;
            }

            const nextIndex = ny * width + nx;
            if (visited[nextIndex] || alphaAt(nx, ny) < 14) {
              continue;
            }

            visited[nextIndex] = 1;
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail += 1;
          }
        }
      }

      if (count >= minPixels) {
        boxes.push({ minX, maxX, minY, maxY, count });
      }
    }
  }

  return boxes
    .sort((a, b) => b.count - a.count)
    .slice(0, 7)
    .sort((a, b) => {
      const rowDiff = a.minY - b.minY;
      if (Math.abs(rowDiff) > 40) return rowDiff;
      return a.minX - b.minX;
    });
}

function boxToDataUrl(sourceImage, box) {
  const width = box.maxX - box.minX + 1;
  const height = box.maxY - box.minY + 1;
  const padding = Math.round(Math.max(width, height) * 0.12);
  const canvas = document.createElement("canvas");
  canvas.width = width + padding * 2;
  canvas.height = height + padding * 2;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    sourceImage,
    box.minX,
    box.minY,
    width,
    height,
    padding,
    padding,
    width,
    height
  );

  return canvas.toDataURL("image/png");
}

async function buildTurnaroundPoseSources(turnaroundSrc) {
  const turnaroundImage = await loadImage(turnaroundSrc);
  const boxes = extractOpaqueComponents(turnaroundImage);
  return boxes.length > 0 ? boxes.map((box) => boxToDataUrl(turnaroundImage, box)) : [turnaroundSrc];
}

function buildReason(detail, poseCount) {
  const strengths = [];
  const deductions = [];

  if (detail.colorScore >= 72) {
    strengths.push("머리, 눈, 부리, 볼, 팔, 발 등 부위별 색 배치");
  } else {
    const weakParts = (detail.partScores ?? [])
      .filter((part) => part.score < 62)
      .slice(0, 3)
      .map((part) => part.label);
    deductions.push(
      weakParts.length > 0
        ? `${weakParts.join(", ")}의 색 배치`
        : "부위별 색 배치"
    );
  }

  if (detail.shapeScore >= 72) {
    strengths.push("몸통 비율과 윤곽선");
  } else {
    deductions.push("몸통 비율과 포즈 윤곽");
  }

  if (detail.featureScore >= 72) {
    strengths.push("가방 유무·형태와 전체 프로포션");
  } else {
    deductions.push("가방 형태, 초록 가방 위치, 전체 프로포션");
  }

  const strengthText =
    strengths.length > 0
      ? `${strengths.join(", ")}이(가) 기준과 가까웠습니다`
      : "전체 실루엣 일부가 기준과 맞았습니다";
  const deductionText =
    deductions.length > 0
      ? `${deductions.join(", ")}에서 차이가 있어 점수가 조정되었습니다`
      : "세부 디테일 차이에서만 일부 감점되었습니다";

  return `턴어라운드 ${poseCount}개 이미지와 각각 비교한 결과, ${detail.poseIndex}번 이미지가 가장 유사했습니다. ${strengthText}. ${deductionText}.`;
}

export async function calculateTurnaroundSimilarity(turnaroundSrc, targetSrc) {
  const poseSources = await buildTurnaroundPoseSources(turnaroundSrc);
  const details = await Promise.all(
    poseSources.map(async (poseSrc, index) => ({
      ...(await calculateSimilarityDetail(poseSrc, targetSrc)),
      poseIndex: index + 1
    }))
  );
  const best = details.reduce((currentBest, detail) =>
    detail.score > currentBest.score ? detail : currentBest
  );

  return {
    ...best,
    reason: buildReason(best, poseSources.length)
  };
}
