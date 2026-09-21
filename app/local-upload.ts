/**
 * Saves a File into the project Upload/ folder via the Vite local API.
 * Destination: /home/leafyishere/Current_Projects/SeeTogether/Upload
 * No cloud, no classification — flat write of whatever was dropped.
 */
export const PROJECT_UPLOAD_DIR = '/home/leafyishere/Current_Projects/SeeTogether/Upload';

type UploadResponse = {ok?: boolean; path?: string; message?: string; dir?: string};

export async function saveToProjectUpload(file: File): Promise<string> {
  const res = await fetch(`/api/upload?name=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/octet-stream'},
    body: file,
  });
  const data = (await res.json().catch(() => ({}))) as UploadResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || `Upload failed (${res.status})`);
  }
  return `Upload/${data.path || file.name}`;
}

export async function saveManyToProjectUpload(files: File[]): Promise<{okPaths: string[]; errors: string[]}> {
  const okPaths: string[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      okPaths.push(await saveToProjectUpload(file));
    } catch {
      errors.push(file.name);
    }
  }
  return {okPaths, errors};
}
