import styled from "@emotion/styled";
import { css, Global } from "@emotion/react";
import { useEffect, useState } from "react";

import Navigation from "./Navigation";
import { deleteKey, getKey, listKeys, mvKey, upsertKey } from "../libs/api";
import { saveToOPFS } from "../libs/opfs";

const globalStyles = css`
  :root {
    --key-color: hsl(25, 80%, 65%);
  }

  * {
    font-family: "Noto Sans Mono", "Noto Sans JP", sans-serif;
    font-optical-sizing: auto;
    font-style: normal;
  }

  body {
    color: #333;
    font-size: 15px;
    margin: 0;
    overflow: hidden;
  }
`;

const Wrapper = styled.div`
  height: calc(100vh - 48px);
  padding: 24px 40px;
  display: flex;
  gap: 24px;
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Header = styled.footer`
  display: flex;
  gap: 12px;
`;

const Key = styled.div`
  display: flex;

  input {
    width: 400px;
    border: none;
    border-bottom: 1px solid #999;
  }
`;

const Unsaved = styled.div`
  color: #c00;
`;

const Textarea = styled.textarea`
  width: 100%;
  height: 100%;
  padding: 16px;
  flex-grow: 1;
  box-sizing: border-box;
`;

const App = () => {
  const [keys, setKeys] = useState<string[]>([]);
  const [currentKey, setCurrentKey] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [savedBody, setSavedBody] = useState<string>("");

  const normalizeKey = (key: string) => {
    return key.replace(/^\//, "").replace(/\/$/, "");
  };

  const upsertKeyInternally = async () => {
    try {
      await upsertKey(currentKey, body);
    } catch (e) {
      alert(`[upsertKey] ${e}`);
      return;
    }

    try {
      saveToOPFS(currentKey, body);
    } catch (e) {
      // pass
    }

    setSavedBody(body);
    updateKeys();
  };

  const deleteKeyInternally = async () => {
    const ok = window.confirm("Are you sure you want to delete this file?");
    if (!ok) {
      return;
    }
    try {
      await deleteKey(currentKey);
    } catch (e) {
      alert(`[deleteKey] ${e}`);
      return;
    }
    updateKeys();
    changeKey("");
  };

  const mvKeyInternally = async () => {
    const newKey = window.prompt("Enter the new key");
    if (newKey === "" || newKey === null) {
      return;
    }
    try {
      await mvKey(currentKey, newKey);
    } catch (e) {
      alert(`[mvKey] ${e}`);
      return;
    }
    updateKeys();
    changeKey(newKey);
  };

  const changeKey = (key: string) => {
    (async () => {
      const normalizedKey = normalizeKey(key);
      setCurrentKey(normalizedKey);

      // URL を更新
      const url = new URL(document.location.href);
      url.searchParams.set("key", `/${normalizedKey}`);
      history.replaceState({ key: `/${normalizedKey}` }, "", url);

      if (normalizedKey === "") {
        return;
      }

      try {
        const text = await getKey(normalizedKey);
        setBody(text);
        setSavedBody(text);
      } catch (e) {
        alert(`[getKey] ${e}`);
      }
    })();
  };

  const updateKeys = async () => {
    try {
      setKeys(await listKeys());
    } catch (e) {
      alert(`[listKeys] ${e}`);
    }
  };

  useEffect(() => {
    (async () => {
      await updateKeys();
      const params = new URLSearchParams(document.location.search);
      const key = params.get("key");
      if (key) {
        changeKey(key.replace(/^\//, ""));
      }
    })();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || (e.metaKey && e.key === "s")) {
        upsertKeyInternally();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <>
      <Global styles={globalStyles} />
      <Wrapper>
        <Navigation keys={keys} currentKey={currentKey} changeKey={changeKey} />
        <Body>
          <Header>
            <Key>
              /
              <input
                type="text"
                value={currentKey}
                onChange={(e) => setCurrentKey(e.target.value)}
              />
            </Key>
            <input
              type="button"
              value="Save (Ctrl+S)"
              onClick={() => upsertKeyInternally()}
            />
            <input
              type="button"
              value="Delete"
              onClick={() => deleteKeyInternally()}
            />
            <input
              type="button"
              value="Rename"
              onClick={() => mvKeyInternally()}
            />
            {body !== savedBody && <Unsaved>未保存</Unsaved>}
          </Header>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </Body>
      </Wrapper>
    </>
  );
};

export default App;
