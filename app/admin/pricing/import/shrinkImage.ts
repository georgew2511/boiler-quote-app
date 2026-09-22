// Re-encodes a large image in the browser before upload so it fits under
// Vercel's and Next's request size limits. Files already under `overBytes`,
// and anything that isn't an image, pass through untouched.
export async function shrinkImage(
    file: File,
    { overBytes, maxSide, type }: { overBytes: number; maxSide: number; type: 'image/jpeg' | 'image/webp' },
): Promise<File> {
    if (!file.type.startsWith('image/') || file.size < overBytes) return file
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
    const ext = type === 'image/webp' ? 'webp' : 'jpg'
    return blob ? new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), { type }) : file
}
