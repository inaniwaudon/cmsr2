export const listKeys = async () => {
  const response = await fetch("/api/lists/");
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const getKey = async (key: string) => {
  const response = await fetch(`/api/files/${key}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.text();
};

export const upsertKey = async (key: string, body: string) => {
  const response = await fetch(`/api/files/${key}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

export const deleteKey = async (key: string) => {
  const response = await fetch(`/api/files/${key}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

export const mvKey = async (srcKey: string, dstKey: string) => {
  const response = await fetch(`/api/mv`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ srcKey, dstKey }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};
