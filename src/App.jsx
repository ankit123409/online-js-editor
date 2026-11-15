import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Play,
  Share2,
  MoreVertical,
  GripVertical,
  Trash2,
  RotateCcw
} from "lucide-react";

const DEFAULT_CODE = `// Online JavaScript compiler (editor)
// Write and run JavaScript online using this JS editor.

console.log("Try clicking the Run button.");`;

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState([]);
  const [editorWidth, setEditorWidth] = useState(50);
  const [menuOpen, setMenuOpen] = useState(false);
  const iframeRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "compiler-console") return;

      setOutput((previous) => [
        ...previous,
        { type: event.data.level, value: event.data.value }
      ]);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const runCode = () => {
    setOutput([]);

    // The iframe uses a sandbox without allow-same-origin, keeping the
    // executed code separate from the React application's document.
    const encodedCode = JSON.stringify(code).replace(/</g, "\\u003c");

    const html = `<!doctype html>
<html>
<body>
<script>
  const send = (level, args) => {
    const value = args.map((item) => {
      if (typeof item === "string") return item;
      if (item instanceof Error) return item.stack || item.message;
      if (item === undefined) return "undefined";
      if (typeof item === "function") return item.toString();
      try {
        const json = JSON.stringify(item);
        return json === undefined ? String(item) : json;
      } catch {
        return String(item);
      }
    }).join(" ");

    parent.postMessage({
      type: "compiler-console",
      level,
      value
    }, "*");
  };

  console.log = (...args) => send("log", args);
  console.info = (...args) => send("info", args);
  console.warn = (...args) => send("warn", args);
  console.error = (...args) => send("error", args);
  console.clear = () => parent.postMessage({ type: "compiler-clear" }, "*");

  window.onerror = (message, source, line, column) => {
    send("error", [message + " (line " + line + ")"]);
  };

  window.onunhandledrejection = (event) => {
    send("error", ["Unhandled promise rejection:", event.reason]);
  };

  try {
    const userCode = ${encodedCode};
    new Function(userCode)();
  } catch (error) {
    send("error", [error]);
  }
<\/script>
</body>
</html>`;

    if (iframeRef.current) iframeRef.current.srcdoc = html;
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "compiler-clear") setOutput([]);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragging.current) return;
      const width = (event.clientX / window.innerWidth) * 100;
      setEditorWidth(Math.min(80, Math.max(20, width)));
    };
    const stopDragging = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, []);

  const clearOutput = () => setOutput([]);

  const shareCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setOutput([{ type: "info", value: "Code copied to clipboard." }]);
    } catch {
      setOutput([{ type: "error", value: "Unable to access clipboard." }]);
    }
  };

  return (
    <main className="compiler">
      <section className="editor-panel" style={{ width: `${editorWidth}%` }}>
        <header className="toolbar">
          <div className="file-tab">main.js</div>
          <div className="editor-actions">
            <button className="clear-btn" onClick={clearOutput}>Clear</button>
            <button className="run-btn" onClick={runCode}>
              Run <Play size={15} fill="currentColor" />
            </button>
          </div>
        </header>

        <div className="code-area">
          <Editor
            height="100%"
            language="javascript"
            theme="light"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{
              fontSize: 17,
              fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
              lineHeight: 30,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              lineNumbers: "on",
              folding: false,
              renderLineHighlight: "line",
              padding: { top: 12 },
              tabSize: 2,
              overviewRulerLanes: 0,
              scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 }
            }}
          />
        </div>
      </section>

      <div
        className="resize-divider"
        role="separator"
        aria-label="Resize editor and output panels"
        onPointerDown={() => { dragging.current = true; }}
      >
        <div className="resize-handle"><GripVertical size={17} /></div>
      </div>

      <section className="output-panel">
        <header className="output-toolbar">
          <span>Output</span>
          <div className="output-actions">
            <button className="icon-btn" title="Copy code" onClick={shareCode}>
              <Share2 size={23} />
            </button>
            <div className="menu-container">
              <button
                className="icon-btn"
                title="More options"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreVertical size={23} />
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  <button onClick={() => { clearOutput(); setMenuOpen(false); }}>
                    <Trash2 size={15} /> Clear output
                  </button>
                  <button onClick={() => {
                    setCode(DEFAULT_CODE);
                    clearOutput();
                    setMenuOpen(false);
                  }}>
                    <RotateCcw size={15} /> Reset editor
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="output-content" aria-live="polite">
          {output.map((item, index) => (
            <div key={index} className={`output-line ${item.type}`}>
              {item.value}
            </div>
          ))}
        </div>
      </section>

      <iframe
        ref={iframeRef}
        title="JavaScript code execution"
        sandbox="allow-scripts"
        className="execution-frame"
      />
    </main>
  );
}