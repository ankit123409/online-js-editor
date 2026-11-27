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
    <div className="site-page">
      <header className="page-intro">
        <p className="eyebrow">JAVASCRIPT PLAYGROUND</p>
        <h1>Free Online JavaScript Compiler</h1>
        <p>
          Write JavaScript, run it in your browser, and see messages from
          <code> console.log()</code> in the output panel. Use the editor to
          experiment with examples and learn how each change affects a program.
        </p>
      </header>

      <main>
        <section className="tool-section" aria-labelledby="editor-heading">
          <div className="tool-heading">
            <div>
              <h2 id="editor-heading">JavaScript code editor</h2>
              <p>Change the sample code, then select Run to execute it.</p>
            </div>
          </div>

          <div className="compiler">
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

            <section className="output-panel" aria-label="Program output">
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
          </div>

          <p className="tool-note">
            Code runs locally in this browser session. Avoid entering passwords,
            private keys, or other sensitive information in code examples.
          </p>
        </section>

        <article className="learning-content">
          <section aria-labelledby="using-editor">
            <h2 id="using-editor">How to use this JavaScript editor</h2>
            <ol>
              <li><strong>Write or edit code.</strong> The editor starts with a small example. Replace it with your own JavaScript or adjust one line at a time.</li>
              <li><strong>Run the program.</strong> Select <em>Run</em> to execute the current code. Messages written with <code>console.log()</code>, <code>console.info()</code>, <code>console.warn()</code>, and <code>console.error()</code> appear in the Output panel.</li>
              <li><strong>Read the result.</strong> If the output is unexpected, check spelling, punctuation, and the line where an error is reported. Edit the code and run it again.</li>
            </ol>
            <p>
              This page is designed for short experiments and learning. It does
              not install packages or provide a Node.js server environment, so
              browser-specific APIs and server-only modules may not behave as
              they would in a full application.
            </p>
          </section>

          <section aria-labelledby="example-heading">
            <h2 id="example-heading">Example: calculate a total</h2>
            <p>
              Variables hold values that you can reuse. This example multiplies
              a price by a quantity, then prints a labeled result:
            </p>
            <pre><code>{`const price = 12;
const quantity = 3;
const total = price * quantity;

console.log("Total:", total);`}</code></pre>
            <p>
              Run the example to see <code>Total: 36</code>. Try changing the
              price or quantity. You can also replace multiplication with
              addition, subtraction, or division to explore JavaScript
              arithmetic operators.
            </p>
          </section>

          <section aria-labelledby="practice-heading">
            <h2 id="practice-heading">Ideas to practice</h2>
            <ul>
              <li>Store a name in a variable and print a greeting.</li>
              <li>Use an <code>if</code> statement to choose between two messages.</li>
              <li>Write a function that converts minutes into seconds.</li>
              <li>Loop through an array and print each item with its position.</li>
            </ul>
            <p>
              For useful debugging, print intermediate values as you work.
              Clear the output when it becomes noisy, then run a smaller part
              of your program to isolate what needs attention.
            </p>
          </section>

          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading">Frequently asked questions</h2>
            <h3>Where does my code run?</h3>
            <p>
              The editor evaluates your JavaScript in a sandboxed browser
              frame. The output shown here is collected from that frame; this
              tool is for learning and short snippets, not a production hosting
              or server execution environment.
            </p>
            <h3>Can I use npm packages?</h3>
            <p>
              No. This standalone editor does not install dependencies or
              configure a build system. Use a project environment when your
              code depends on npm packages, files, or a backend service.
            </p>
            <h3>How do I start over?</h3>
            <p>
              Open the options menu in the Output panel and choose
              <em> Reset editor</em> to restore the starter code. Choose
              <em> Clear output</em> to remove messages without changing your
              program.
            </p>
          </section>
        </article>
      </main>

      <iframe
        ref={iframeRef}
        title="JavaScript code execution"
        sandbox="allow-scripts"
        className="execution-frame"
      />
    </div>
  );
}