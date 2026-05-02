import os
from PIL import Image

def convert_to_webp():
    assets_dir = 'assets'
    for filename in os.listdir(assets_dir):
        if filename.endswith('.png'):
            name = os.path.splitext(filename)[0]
            img = Image.open(os.path.join(assets_dir, filename))
            # Convert to WebP with high quality (80-90 is usually enough)
            img.save(os.path.join(assets_dir, f"{name}.webp"), "WEBP", quality=85)
            print(f"❄️  Converted: {filename} -> {name}.webp")

if __name__ == "__main__":
    convert_to_webp()
