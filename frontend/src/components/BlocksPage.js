// src/components/BlocksPage.js
import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import Ajv from "ajv";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Calendar as CalIcon, ChevronDown, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// JSON‑schema validator
const ajv = new Ajv({ allErrors: true, useDefaults: true });
function validate(schema, data) {
  const check = ajv.compile(schema);
  const ok = check(data);
  return { ok, errors: check.errors || [] };
}

// Custom node UI with handles for connections
const CustomNode = ({ data }) => {
  let Icon = null;
  if (data.nodeId === "trigger_user_input") {
    Icon = <Zap size={18} className="tw-text-blue-500" />;
  } else if (data.nodeId.startsWith("trigger_")) {
    Icon = <Zap size={18} className="tw-text-gray-500" />;
  } else if (data.nodeId === "action_send_email") {
    Icon = <Mail size={18} className="tw-text-red-500" />;
  } else if (data.nodeId === "action_create_event") {
    Icon = <CalIcon size={18} className="tw-text-green-500" />;
  }

  const borderClass = data.color.replace(/^bg-/, "border-");

  return (
    <div
      className={`tw-bg-white tw-text-gray-900 tw-rounded-2xl tw-shadow-xl tw-p-4 tw-border-l-4 ${borderClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#555" }}
      />
      <div className="tw-flex tw-items-center tw-space-x-2">
        {Icon}
        <span className="tw-font-semibold tw-text-base">{data.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#555" }}
      />
    </div>
  );
};
const nodeTypes = { custom: CustomNode };

export default function BlocksPage() {
  // palette, nodes, edges etc.
  const [palette, setPalette] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [idCounter, setIdCounter] = useState(1);

  // config modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [form, setForm] = useState({});
  const [schema, setSchema] = useState(null);
  const [errors, setErrors] = useState([]);

  // saved flows state
  const [flows, setFlows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // chat UI state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // collapsible categories
  const categories = ["Trigger", "Action"];
  const [openCategories, setOpenCategories] = useState(
    categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  const toggleCategory = (cat) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // fetch available node definitions
  useEffect(() => {
    fetch(`${API}/api/nodes`)
      .then((r) => r.json())
      .then((d) => setPalette(d.nodes || []))
      .catch(console.error);
  }, []);

  // fetch saved automations
  useEffect(() => {
    fetch(`${API}/api/automations/`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setFlows(d.automations || []))
      .catch(console.error);
  }, []);

  // add a new node from palette, defaulting calendar times if it's an event
  const newNode = useCallback(
    (def) => {
      const id = `node_${idCounter}`;
      setIdCounter((c) => c + 1);

      // if it's the Create Event node, default start/end to now and +1h
      let initialConfig = {};
      if (def.id === "action_create_event") {
        const now = new Date();
        initialConfig.start = now.toISOString();
        initialConfig.end = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      }

      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "custom",
          position: { x: 200 + Math.random() * 160, y: 120 + Math.random() * 120 },
          data: {
            label: def.label,
            nodeId: def.id,
            config: initialConfig,
            schema: def.schema,
            color: def.color,
          },
        },
      ]);
    },
    [idCounter, setNodes]
  );

  // connect handler
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // open configuration modal, injecting defaults if needed
  const openConfig = (node) => {
    let initialForm = { ...(node.data.config || {}) };

    if (node.data.nodeId === "action_create_event") {
      const now = new Date();
      initialForm.start =
        initialForm.start || now.toISOString();
      initialForm.end =
        initialForm.end || new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }

    setEditingNode(node);
    setSchema(node.data.schema);
    setForm(initialForm);
    setErrors([]);
    setModalOpen(true);
  };

  // save config from modal
  const saveConfig = () => {
    const { ok, errors } = validate(schema, form);
    if (!ok) {
      setErrors(errors);
      return;
    }
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingNode.id ? { ...n, data: { ...n.data, config: form } } : n
      )
    );
    setModalOpen(false);
    setEditingNode(null);
  };

  // load an existing flow
  const loadFlow = (id) => {
    fetch(`${API}/api/automations/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then(({ flow }) => {
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);
        setIdCounter((flow.nodes?.length || 0) + 1);
      })
      .catch(console.error);
  };

  // save or update flow
  const saveFlow = () => {
    const isNew = !selectedId;
    let name = null;
    if (isNew) {
      name = window.prompt("Flow name:");
      if (!name) return;
    }
    fetch(`${API}/api/automations/${isNew ? "" : selectedId}`, {
      method: isNew ? "POST" : "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isNew
          ? { name, flow: { nodes, edges } }
          : { flow: { nodes, edges } }
      ),
    })
      .then((r) => r.json())
      .then((d) => {
        const saved = isNew ? d.automation : d;
        setSelectedId(saved.id);
        setFlows((prev) =>
          isNew ? [...prev, saved] : prev.map((f) => (f.id === saved.id ? saved : f))
        );
      })
      .catch(console.error);
  };

  // run flow
  const runFlow = async () => {
    for (const node of nodes) {
      try {
        const res = await fetch(`${API}/api/run-node`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: node.data.nodeId,
            config: node.data.config || {},
          }),
        }).then((r) => r.json());
        if (res.error) throw new Error(res.error);
      } catch (e) {
        alert(`❌ Step "${node.data.label}" failed: ${e.message}`);
        return;
      }
    }
    alert("✅ Flow finished!");
  };

  // handle chat send (Enter)
  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatHistory((h) => [...h, text]);
    setNodes((nds) =>
      nds.map((n) =>
        n.data.nodeId === "trigger_user_input"
          ? {
              ...n,
              data: { ...n.data, config: { input: text } },
            }
          : n
      )
    );
    setChatInput("");
    runFlow();
  };

  return (
    <div className="tw-flex tw-h-[calc(100vh-64px)] tw-font-sans">
      {/* Sidebar */}
      <aside className="tw-w-72 tw-bg-slate-800 tw-text-white tw-p-4 tw-space-y-4 tw-overflow-y-auto tw-rounded-r-2xl">
        <h2 className="tw-text-2xl tw-font-bold tw-border-b tw-border-gray-700 tw-pb-2">
          Saved Flows
        </h2>
        <select
          className="tw-w-full tw-bg-slate-700 tw-p-2 tw-rounded"
          value={selectedId || ""}
          onChange={(e) => {
            const v = e.target.value || null;
            setSelectedId(v);
            if (v) loadFlow(v);
          }}
        >
          <option value="">-- load a flow --</option>
          {flows.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          className="tw-w-full tw-bg-green-600 hover:tw-bg-green-500 tw-p-2 tw-rounded tw-mb-4"
          onClick={saveFlow}
        >
          💾 {selectedId ? "Update Flow" : "Save Flow"}
        </button>

        {categories.map((cat) => (
          <div key={cat} className="tw-mt-6">
            <button
              onClick={() => toggleCategory(cat)}
              className="tw-w-full tw-justify-between tw-flex tw-items-center tw-text-lg tw-font-semibold tw-text-gray-200 tw-py-1 hover:tw-text-white"
            >
              <span>{cat}s</span>
              {openCategories[cat] ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
            <AnimatePresence>
              {openCategories[cat] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="tw-mt-2 tw-space-y-1"
                >
                  {palette
                    .filter((n) => n.category === cat)
                    .map((n) => (
                      <button
                        key={n.id}
                        onClick={() => newNode(n)}
                        className={`tw-w-full tw-p-2 tw-rounded tw-pl-4 ${n.color} tw-text-white tw-text-left hover:tw-opacity-90`}
                      >
                        {n.label}
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        <button
          className="tw-w-full tw-bg-blue-600 hover:tw-bg-blue-500 tw-p-2 tw-rounded tw-mt-8"
          onClick={runFlow}
        >
          ▶ Run Flow
        </button>

        {/* Chat UI */}
        <div className="tw-mt-8">
          <div className="tw-text-lg tw-font-semibold tw-text-gray-200">Chat</div>
          <div className="tw-bg-white tw-text-black tw-rounded tw-p-2 tw-h-40 tw-overflow-y-auto tw-mt-2">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className="tw-mb-1">
                <span className="tw-font-semibold">You:</span> {msg}
              </div>
            ))}
          </div>
          <input
            type="text"
            className="tw-w-full tw-bg-slate-700 tw-text-white tw-p-2 tw-rounded tw-mt-2"
            placeholder="Type a message and hit Enter"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleChatSend();
            }}
          />
        </div>
      </aside>

      {/* Canvas */}
      <main className="tw-flex-1 tw-bg-gray-100">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => openConfig(node)}
          fitView
          nodeTypes={nodeTypes}
        >
          <MiniMap />
          <Controls />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </main>

      {/* Config Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-40 tw-z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-z-50"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="tw-bg-white tw-text-gray-900 tw-rounded-xl tw-shadow-xl tw-w-full tw-max-w-lg tw-p-6">
                <h2 className="tw-text-2xl tw-font-bold tw-mb-4">
                  Configure {editingNode?.data.label}
                </h2>

                {schema && (
                  <form className="tw-space-y-4">
                    {Object.entries(schema.properties || {}).map(([key, spec]) => {
                      const common =
                        "tw-w-full tw-border tw-border-gray-300 tw-rounded-md tw-p-2 focus:tw-ring-2 focus:tw-ring-blue-400";
                      const value = form[key] || "";
                      const onChange = (e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }));
                      return (
                        <label className="tw-block" key={key}>
                          <span className="tw-text-gray-700">
                            {spec.title || key}
                          </span>
                          {spec.x_widget === "textarea" ? (
                            <textarea
                              rows={4}
                              className={common}
                              value={value}
                              onChange={onChange}
                            />
                          ) : (
                            <input
                              type="text"
                              className={common}
                              value={value}
                              onChange={onChange}
                            />
                          )}
                        </label>
                      );
                    })}
                    {errors.length > 0 && (
                      <div className="tw-text-red-600 tw-text-sm">
                        {errors.map((e) => (
                          <div key={e.message}>{e.message}</div>
                        ))}
                      </div>
                    )}
                  </form>
                )}

                <div className="tw-flex tw-justify-end tw-gap-3 tw-mt-6">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="tw-bg-gray-200 hover:tw-bg-gray-300 tw-px-4 tw-py-2 tw-rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveConfig}
                    className="tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-px-4 tw-py-2 tw-rounded-md"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
