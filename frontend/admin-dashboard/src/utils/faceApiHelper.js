/**
 * Module tiện ích Face API Wrapper cho hệ sinh thái Quản lý Nhà xe
 * Cung cấp các API: nạp models, điều khiển webcam, trích xuất vector 128D, và vẽ bounding box trực quan.
 */

import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

/**
 * Nạp trọng số mô hình từ thư mục public/face-models
 */
export async function loadFaceApiModels(modelPath = '/face-models') {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log(`[FaceAPI] Đang tải các mô hình nhận diện khuôn mặt từ ${modelPath}...`);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
      ]);
      modelsLoaded = true;
      console.log('[FaceAPI] Tải mô hình thành công!');
      return true;
    } catch (err) {
      console.warn(`[FaceAPI Warning] Thử lại với máy chủ backend http://localhost:8000/face-models do: ${err.message}`);
      try {
        const fallbackPath = 'http://localhost:8000/face-models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(fallbackPath),
          faceapi.nets.faceLandmark68Net.loadFromUri(fallbackPath),
          faceapi.nets.faceRecognitionNet.loadFromUri(fallbackPath)
        ]);
        modelsLoaded = true;
        console.log('[FaceAPI] Tải mô hình thành công từ fallback backend!');
        return true;
      } catch (fallbackErr) {
        console.error('[FaceAPI Error] Không thể nạp mô hình khuôn mặt:', fallbackErr);
        modelsLoaded = false;
        throw fallbackErr;
      }
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Khởi động Webcam và gắn luồng video vào thẻ <video>
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<MediaStream>}
 */
export async function startWebcam(videoElement) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ truy cập Camera (getUserMedia).');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user'
    },
    audio: false
  });

  if (videoElement) {
    videoElement.srcObject = stream;
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve(videoElement);
      };
    });
  }

  return stream;
}

/**
 * Tính khoảng cách Euclid giữa 2 vector descriptor 128D
 */
export function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += (desc1[i] - desc2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * So khớp khuôn mặt thời gian thực với tập mẫu đăng ký
 * @param {number[]} currentDescriptor - Vector 128D của người trước camera
 * @param {number[][]} storedDescriptors - Tập mẫu 128D đã đăng ký của nhân viên
 * @param {number} threshold - Ngưỡng nghiêm ngặt (mặc định 0.38)
 * @returns {{ isMatch: boolean, bestDistance: number, avgDistance: number, similarity: number }}
 */
export function verifyFaceMatch(currentDescriptor, storedDescriptors, threshold = 0.38) {
  if (!currentDescriptor || !storedDescriptors || storedDescriptors.length === 0) {
    return { isMatch: false, bestDistance: Infinity, avgDistance: Infinity, similarity: 0 };
  }
  const distances = storedDescriptors.map((s) => euclideanDistance(currentDescriptor, s));
  const bestDistance = Math.min(...distances);
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const isMatch = bestDistance <= threshold && avgDistance <= threshold + 0.04;
  const similarity = Math.max(0, Math.min(100, Math.round((1 - bestDistance) * 100)));
  return { isMatch, bestDistance, avgDistance, similarity };
}

/**
 * Dừng luồng Webcam
 * @param {MediaStream} stream
 */
export function stopWebcam(stream) {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

/**
 * Tính tỉ lệ mở mắt (Eye Aspect Ratio - EAR) dựa trên 68 điểm mốc khuôn mặt
 * Dùng cho Liveness Detection (phát hiện nháy mắt chống giả mạo bằng ảnh)
 */
function computeEyeAspectRatio(positions) {
  if (!positions || positions.length < 48) return null;
  const dist = (pA, pB) => Math.hypot(pA.x - pB.x, pA.y - pB.y);
  const earForEye = (p) => {
    const v1 = dist(p[1], p[5]);
    const v2 = dist(p[2], p[4]);
    const h = dist(p[0], p[3]);
    return h > 0 ? (v1 + v2) / (2.0 * h) : 0;
  };
  const leftEye = positions.slice(36, 42);
  const rightEye = positions.slice(42, 48);
  return (earForEye(leftEye) + earForEye(rightEye)) / 2;
}

/**
 * Chụp ảnh snapshot từ luồng video của camera
 * Nén chất lượng JPEG ~35KB để làm chứng từ đối soát
 * @param {HTMLVideoElement} videoElement
 * @param {number} quality - Mức chất lượng JPEG (0.1 - 1.0)
 * @param {number} maxWidth - Độ rộng tối đa để tiết kiệm băng thông
 * @returns {string|null} - Base64 Data URL (image/jpeg)
 */
export function captureSnapshot(videoElement, quality = 0.75, maxWidth = 480) {
  if (!videoElement || !videoElement.videoWidth) return null;
  const canvas = document.createElement('canvas');
  const aspect = (videoElement.videoHeight || 480) / (videoElement.videoWidth || 640);
  canvas.width = maxWidth;
  canvas.height = Math.round(maxWidth * aspect);
  const ctx = canvas.getContext('2d');
  // Lật gương đồng bộ với góc nhìn tự nhiên trên camera trước
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Phát hiện một khuôn mặt duy nhất và trích xuất vector nhúng 128 chiều
 * Tăng độ phân giải lên 416 để nhận diện sắc nét hơn và tính tỉ lệ mở mắt (EAR)
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} inputElement
 * @param {number} inputSize - Mặc định 416 (tối ưu độ chuẩn xác)
 * @returns {Promise<{detection: object, landmarks: object, descriptor: number[] | null, eyeAspectRatio: number | null}>}
 */
export async function detectFaceAndExtractDescriptor(inputElement, inputSize = 416) {
  if (!modelsLoaded) {
    await loadFaceApiModels();
  }

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: inputSize, // 416px tăng độ nét các mốc giải phẫu khuôn mặt
    scoreThreshold: 0.55
  });

  const result = await faceapi
    .detectSingleFace(inputElement, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) {
    return { detection: null, landmarks: null, descriptor: null, eyeAspectRatio: null };
  }

  // Tính toán tỉ lệ mở mắt EAR phục vụ Liveness Check
  let ear = null;
  if (result.landmarks && result.landmarks.positions) {
    ear = computeEyeAspectRatio(result.landmarks.positions);
  }

  return {
    detection: result.detection,
    landmarks: result.landmarks,
    // Chuyển Float32Array sang mảng số chuẩn JavaScript để gửi qua JSON
    descriptor: Array.from(result.descriptor),
    eyeAspectRatio: ear
  };
}

/**
 * Vẽ khung nhận diện lên canvas phủ trên video
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement} video
 * @param {object} detection
 * @param {string} label
 * @param {string} boxColor
 */
/**
 * Chuẩn hóa tên hiển thị theo vai trò, tránh trùng lặp từ ngữ
 * Ví dụ: formatRoleDisplayName('Tài xế', 'Tài xế An Bình') => 'Tài xế: An Bình'
 * @param {string} roleTitle Tiêu đề vai trò (VD: 'Tài xế', 'Phụ xe')
 * @param {string} rawName Tên thô từ user
 * @returns {string}
 */
export function formatRoleDisplayName(roleTitle, rawName) {
  if (!rawName) return `${roleTitle}: Nhận diện tốt`;
  const regex = new RegExp(`^${roleTitle}[:\\s-]*`, 'i');
  const cleaned = rawName.replace(regex, '').trim();
  return `${roleTitle}: ${cleaned || rawName}`;
}

/**
 * Vẽ khung nhận diện lên canvas phủ trên video
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement} video
 * @param {object} detection
 * @param {string} label
 * @param {string} boxColor
 * @param {boolean} isMirrored - Mặc định true nếu video hiển thị lật gương (scaleX(-1))
 */
export function drawDetectionBox(
  canvas,
  video,
  detection,
  label = 'Khuôn mặt hợp lệ',
  boxColor = '#10b981',
  isMirrored = true
) {
  if (!canvas || !video) return;

  // Loại bỏ CSS transform scaleX(-1) trên chính canvas nếu có, tránh làm chữ bị đảo ngược
  if (canvas.style && canvas.style.transform && canvas.style.transform.includes('scaleX(-1)')) {
    canvas.style.transform = canvas.style.transform.replace(/scaleX\(-1\)/g, '').trim();
  }

  const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
  faceapi.matchDimensions(canvas, displaySize);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (detection) {
    const resized = faceapi.resizeResults(detection, displaySize);
    const box = resized.box;

    // Tự động chuẩn hóa câu chữ, sửa lỗi lặp từ: "Tài xế: Tài xế An Bình" -> "Tài xế: An Bình"
    let cleanLabel = label || 'Khuôn mặt hợp lệ';
    if (typeof cleanLabel === 'string') {
      cleanLabel = cleanLabel.replace(/^([^:]+):\s*\1\s*/i, '$1: ').trim();
    }

    // Nếu video hiển thị dạng gương soi (scaleX(-1)), tọa độ X của khung hình cần đảo ngược trên canvas
    const boxX = isMirrored ? (displaySize.width - box.x - box.width) : box.x;
    const boxY = box.y;
    const boxWidth = box.width;
    const boxHeight = box.height;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = boxColor;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Tính toán kích thước nhãn chữ
    ctx.font = 'bold 13px Inter, -apple-system, sans-serif';
    const textWidth = ctx.measureText(cleanLabel).width;
    const badgeHeight = 24;
    const badgeY = boxY > badgeHeight + 2 ? boxY - badgeHeight - 2 : boxY;
    const badgeWidth = textWidth + 16;

    // Vẽ nền nhãn
    ctx.fillStyle = boxColor;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(boxX, badgeY, badgeWidth, badgeHeight, [4, 4, 0, 0]);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, badgeY, badgeWidth, badgeHeight);
    }

    // Vẽ chữ hiển thị (chữ viết xuôi từ trái sang phải, không bị lật ngược)
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanLabel, boxX + 8, badgeY + (badgeHeight / 2));
    ctx.restore();
  }
}

/**
 * Xóa nội dung trên Canvas
 * @param {HTMLCanvasElement} canvas
 */
export function clearCanvas(canvas) {
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
