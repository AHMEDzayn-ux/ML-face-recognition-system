import cv2
import numpy as np

# Create a simple test image (a blue square with some text)
img = np.ones((300, 300, 3), dtype=np.uint8) * 255
cv2.rectangle(img, (50, 50), (250, 250), (255, 0, 0), -1)
cv2.putText(img, 'Test Image', (80, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

# Save the test image
test_img_path = 'test_photo.jpg'
cv2.imwrite(test_img_path, img)
print(f"✅ Test image created: {test_img_path}")
