import styled from "@emotion/styled";
import { useMemo } from "react";

const Nav = styled.nav`
  width: 300px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Ul = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Li = styled.li`
  line-height: 1;

  h3 {
    font-size: inherit;
    margin: 0;
  }
`;

const Anchor = styled.a<{ current: boolean }>`
  text-decoration: ${({ current }) => (current ? "underline" : "none")};
  font-size: 14px;
  cursor: pointer;
  word-break: break-all;
`;

interface NavigationProps {
  keys: string[];
  currentKey: string;
  changeKey: (key: string) => void;
}

const Navigation = ({ keys, currentKey, changeKey }: NavigationProps) => {
  const keysByPrefix = useMemo(() => {
    const keyDict: Record<string, string[]> = {};

    for (const key of keys) {
      const prefix = key.split("/").slice(0, -1).join("/");
      if (!keyDict[prefix]) {
        keyDict[prefix] = [];
      }
      const filename = key.split("/").at(-1)!;
      keyDict[prefix].push(filename);
    }

    // 同階層で、index.* を先頭にする
    for (const prefix in keyDict) {
      keyDict[prefix].sort((a, b) =>
        a.startsWith("index") ? -1 : a > b ? 1 : -1
      );
    }

    // prefix 毎に分類
    const sortedPrefixes = Object.keys(keyDict).sort();
    const result: { prefix: string; filenames: string[] }[] = [];
    for (const prefix of sortedPrefixes) {
      result.push({ prefix, filenames: keyDict[prefix] });
    }
    return result;
  }, [keys]);

  return (
    <Nav>
      {keysByPrefix.map(({ prefix, filenames }) => (
        <Ul>
          <Li key={prefix}>
            <h3>/{prefix}</h3>
          </Li>
          {filenames.map((name) => {
            const key = prefix === "" ? name : `${prefix}/${name}`;
            return (
              <Li key={key}>
                <Anchor
                  current={key === currentKey}
                  onClick={() => changeKey(key)}
                >
                  - {name}
                </Anchor>
              </Li>
            );
          })}
        </Ul>
      ))}
    </Nav>
  );
};

export default Navigation;
