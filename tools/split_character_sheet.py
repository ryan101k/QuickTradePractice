from pathlib import Path
import sys

from PIL import Image


def main() -> None:
    source = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    stem = sys.argv[3]
    output_dir.mkdir(parents=True, exist_ok=True)

    image = Image.open(source).convert("RGB")
    width, height = image.size
    if width != height or width % 2 or height % 2:
        raise ValueError(f"Expected an even square 2x2 sheet, got {image.size}")

    half_w, half_h = width // 2, height // 2
    panels = {
        "neutral": (0, 0, half_w, half_h),
        "happy": (half_w, 0, width, half_h),
        "sad": (0, half_h, half_w, height),
        "angry": (half_w, half_h, width, height),
    }
    for mood, box in panels.items():
        panel = image.crop(box).resize((640, 640), Image.Resampling.LANCZOS)
        panel.save(output_dir / f"{stem}-{mood}.webp", "WEBP", quality=92, method=6)


if __name__ == "__main__":
    main()
