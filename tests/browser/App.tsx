import { useState } from "react";
import { ActiveDocumentClient } from "../../components/mdx/ActiveDocumentClient";
export function App({ html }: { html: string }) {
  const [visible, setVisible] = useState(true);
  return <><button onClick={() => setVisible(value => !value)}>Toggle documents</button>{visible && <><div data-testid="first"><ActiveDocumentClient html={html} /></div><div data-testid="second"><ActiveDocumentClient html={html} /></div></>}</>;
}
