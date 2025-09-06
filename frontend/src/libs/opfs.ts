const getAppDir = async () => {
  const root = await (navigator as any).storage.getDirectory();
  return await root.getDirectoryHandle("files", { create: true });
};

const pruneOldFiles = async (
  dirHandle: FileSystemDirectoryHandle,
  maxFiles: number
) => {
  // ファイルを走査
  const files: {
    name: string;
    handle: FileSystemFileHandle;
    lastModified: number;
  }[] = [];
  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (handle.kind === "file") {
      const matches = /^(\d+)_/.exec(name);
      if (matches) {
        files.push({ name, handle, lastModified: Number(matches[1]) });
      }
    }
  }
  if (files.length <= maxFiles) {
    return;
  }
  // タイムスタンプが古い順にソートして、古いものから削除
  files.sort((a, b) => a.lastModified - b.lastModified);
  for (let i = 0; i < files.length - maxFiles; i++) {
    await dirHandle.removeEntry(files[i].name);
  }
};

export const saveToOPFS = async (key: string, data: string) => {
  const dir = await getAppDir();
  const name = `${Date.now()}_${key.replaceAll("/", "_")}`;
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
  await pruneOldFiles(dir, 100);
};
