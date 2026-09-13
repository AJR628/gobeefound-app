import { describe, expect, it } from "vitest";
import { sniffImage, LOGO_MAX_BYTES } from "@/lib/storage";

describe("§12.1 logo sniffing — magic bytes, never client-declared type", () => {
  it("detects PNG", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toEqual({ ext: "png", mime: "image/png" });
  });
  it("detects JPEG", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toEqual({ ext: "jpg", mime: "image/jpeg" });
  });
  it("rejects SVG", () => {
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });
  it("rejects GIF, WebP, and empty input", () => {
    expect(sniffImage(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("RIFF....WEBP"))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
  it("caps at 2 MB", () => {
    expect(LOGO_MAX_BYTES).toBe(2 * 1024 * 1024);
  });
});
