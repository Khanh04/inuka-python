"""Image processing service using OpenCV."""
import cv2
import numpy as np
from typing import Tuple, Optional


class ImageProcessingService:
    """Service for image processing operations."""

    def match_and_rescale(
        self, image_data: bytes, template_data: bytes
    ) -> bytes:
        """Match and rescale image using SIFT and homography."""
        try:
            # Decode images
            img = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
            template_img = cv2.imdecode(
                np.frombuffer(template_data, np.uint8), cv2.IMREAD_COLOR
            )

            # Convert to grayscale
            img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            template_gray = cv2.cvtColor(template_img, cv2.COLOR_BGR2GRAY)

            # SIFT feature detection
            sift = cv2.SIFT_create()
            kp1, desc1 = sift.detectAndCompute(img_gray, None)
            kp2, desc2 = sift.detectAndCompute(template_gray, None)

            # Match features
            bf = cv2.BFMatcher()
            matches = bf.knnMatch(desc1, desc2, k=2)

            # Lowe's ratio test
            good_matches = []
            for m, n in matches:
                if m.distance < 0.75 * n.distance:
                    good_matches.append(m)

            if len(good_matches) < 4:
                raise ValueError("Not enough good matches found")

            # Get matched points
            src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(
                -1, 1, 2
            )
            dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(
                -1, 1, 2
            )

            # Find homography
            M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 3.0)

            # Warp image
            h, w = template_img.shape[:2]
            rescaled = cv2.warpPerspective(img, M, (w, h))

            # Encode to JPEG
            _, buffer = cv2.imencode(".jpg", rescaled)
            return buffer.tobytes()
        except Exception as e:
            raise Exception(f"Image processing failed: {str(e)}")

    def extract_section(
        self, image_data: bytes, x: int, y: int, width: int, height: int
    ) -> bytes:
        """Extract a section from an image."""
        try:
            img = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
            section = img[y : y + height, x : x + width]
            _, buffer = cv2.imencode(".jpg", section)
            return buffer.tobytes()
        except Exception as e:
            raise Exception(f"Section extraction failed: {str(e)}")

    def resize_image(
        self, image_data: bytes, width: int, height: int
    ) -> bytes:
        """Resize an image."""
        try:
            img = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
            resized = cv2.resize(img, (width, height))
            _, buffer = cv2.imencode(".jpg", resized)
            return buffer.tobytes()
        except Exception as e:
            raise Exception(f"Image resize failed: {str(e)}")
