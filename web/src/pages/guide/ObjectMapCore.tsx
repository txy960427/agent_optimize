import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  type Node,
  type NodeProps,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  BrainCircuit,
  Workflow,
  Database,
  Wrench,
  FileText,
  Layers3,
  Network,
  ShieldCheck,
  Boxes,
  Activity,
  Sparkles,
  SlidersHorizontal,
  FlaskConical,
  BookOpen,
  Play,
  Pause,
  X,
  ChevronRight,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { objects, objectById } from "../../domain/data";
import { Button, Modal } from "../../components/ui";
import { usePlaybackVisibility, useReducedMotionPreference } from "../../components/usePlaybackVisibility";

type MapData = {
  label: string;
  objectId: string;
  active: boolean;
  related: boolean;
  tone: string;
  live: boolean;
};
type MapNode = Node<MapData>;
const icons: Record<string, typeof BrainCircuit> = {
  model: BrainCircuit,
  harness: Workflow,
  memory: Database,
  tool: Wrench,
  prompt: FileText,
  skill: Layers3,
  architecture: Network,
  environment: ShieldCheck,
  selection: SlidersHorizontal,
  training: BrainCircuit,
  quantization: Boxes,
  sandbox: FlaskConical,
  monitoring: Activity,
  safety: ShieldCheck,
  collaboration: Network,
  personalization: Sparkles,
  evaluation: FlaskConical,
};
const supportRelations: Record<string, string[]> = {
  support: ["model", "harness", "environment"],
  collaboration: ["model", "harness", "environment"],
  personalization: ["model", "harness", "prompt", "memory"],
  evaluation: ["model", "harness", "environment"],
};
const stages = [
  {
    id: "harness",
    title: "准备任务信息",
    detail: "Harness组织上下文、规则与状态，交给模型。",
  },
  {
    id: "model",
    title: "模型理解与判断",
    detail: "模型根据实际输入，给出回答或动作建议。",
  },
  {
    id: "harness",
    title: "校验与调度动作",
    detail: "Harness校验建议，组织工具和后续执行。",
  },
  {
    id: "environment",
    title: "执行与结果反馈",
    detail: "环境承载实际动作，结果与异常回到运行过程。",
  },
  {
    id: "collaboration",
    title: "跨对象协同改进",
    detail: "联合调整模型、Harness和环境的配合方式。",
  },
  {
    id: "personalization",
    title: "反馈与个性化适配",
    detail: "用户偏好与纠正可关联记忆、Prompt和模型适配。",
  },
  {
    id: "evaluation",
    title: "测评与数据回流",
    detail: "对照效果、积累样本，为下一轮改进提供依据。",
  },
];
const specs: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  parent?: string;
  group?: boolean;
}[] = [
  { id: "model", x: 12, y: 26, w: 228, h: 218, group: true },
  { id: "harness", x: 360, y: 26, w: 300, h: 218, group: true },
  { id: "selection", x: 16, y: 54, w: 196, h: 42, parent: "model" },
  { id: "training", x: 16, y: 106, w: 196, h: 42, parent: "model" },
  { id: "quantization", x: 16, y: 158, w: 196, h: 42, parent: "model" },
  { id: "prompt", x: 16, y: 54, w: 126, h: 42, parent: "harness" },
  { id: "skill", x: 158, y: 54, w: 126, h: 42, parent: "harness" },
  { id: "tool", x: 16, y: 106, w: 126, h: 42, parent: "harness" },
  { id: "memory", x: 158, y: 106, w: 126, h: 42, parent: "harness" },
  { id: "architecture", x: 16, y: 158, w: 268, h: 42, parent: "harness" },
  { id: "environment", x: 12, y: 302, w: 648, h: 108, group: true },
  { id: "sandbox", x: 16, y: 50, w: 196, h: 42, parent: "environment" },
  { id: "monitoring", x: 226, y: 50, w: 196, h: 42, parent: "environment" },
  { id: "safety", x: 436, y: 50, w: 196, h: 42, parent: "environment" },
  { id: "support", x: 12, y: 438, w: 648, h: 108, group: true },
  { id: "collaboration", x: 16, y: 50, w: 196, h: 42, parent: "support" },
  { id: "personalization", x: 226, y: 50, w: 196, h: 42, parent: "support" },
  { id: "evaluation", x: 436, y: 50, w: 196, h: 42, parent: "support" },
];
function toneOf(id: string) {
  if (["model", "selection", "training", "quantization"].includes(id))
    return "violet";
  if (
    ["harness", "prompt", "skill", "tool", "memory", "architecture"].includes(
      id,
    )
  )
    return "blue";
  if (["environment", "sandbox", "monitoring", "safety"].includes(id))
    return "teal";
  return "amber";
}
function ObjectNode({ data }: NodeProps<MapNode>) {
  const Icon = icons[data.objectId] ?? BookOpen;
  return (
    <div
      className={`object-node tone-${data.tone} ${data.active ? "object-active" : ""} ${data.related ? "object-related" : ""} ${data.live ? "object-live" : ""}`}
    >
      <Icon size={18} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} id="feedback" />
    </div>
  );
}
function GroupNode({ data }: NodeProps<MapNode>) {
  const Icon = icons[data.objectId] ?? Network;
  return (
    <div
      className={`group-node tone-${data.tone} ${data.active ? "group-active" : data.related ? "group-related" : ""} ${data.live ? "group-live" : ""}`}
    >
      <div className="group-title">
        <Icon size={19} />
        {data.label}
        <span>
          {data.objectId === "model"
            ? "理解与判断"
            : data.objectId === "harness"
              ? "组织与执行"
              : data.objectId === "environment"
                ? "执行条件"
                : "持续改进"}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="rs"
        style={{ top: "35%" }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="rt"
        style={{ top: "65%" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="ls"
        style={{ top: "65%" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="lt"
        style={{ top: "35%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bs"
        style={{ left: "70%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="tt"
        style={{ left: "70%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="feedback-top"
        style={{ left: "50%" }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="feedback-right"
        style={{ top: "50%" }}
      />
    </div>
  );
}
const nodeTypes = { object: ObjectNode, groupObject: GroupNode };
function SignalEdge(props: EdgeProps) {
  const calculated = getSmoothStepPath(props);
  let path = calculated[0];
  if (props.data?.feedback) {
    const channel = Number(props.data.channel);
    const bottom = Number(props.data.bottom);
    path =
      props.target === "model"
        ? `M ${props.sourceX} ${props.sourceY} V ${bottom} H ${channel} V 8 H ${props.targetX} V ${props.targetY}`
        : `M ${props.sourceX} ${props.sourceY} V ${bottom} H ${channel} V ${props.targetY} H ${props.targetX}`;
  }
  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={props.markerEnd}
        style={props.style}
        label={props.label}
        labelX={calculated[1]}
        labelY={calculated[2]}
        labelStyle={props.labelStyle}
        labelBgStyle={props.labelBgStyle}
        labelBgPadding={props.labelBgPadding}
        labelBgBorderRadius={props.labelBgBorderRadius}
      />
      {props.data?.moving && (
        <circle
          className="moving-token"
          r={props.data.feedback ? 3.5 : 4}
          fill={String(props.data.color ?? "#5a6dca")}
        >
          <animateMotion
            dur={props.data.feedback ? "3.2s" : "1.8s"}
            repeatCount="indefinite"
            path={path}
          />
        </circle>
      )}
    </>
  );
}
const edgeTypes = { signal: SignalEdge };

export function ObjectMap({
  selected,
  onSelect,
  onReady,
  compact = false,
  moving = false,
  actor = "",
  onInspect,
  onLeave,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onReady?: (instance: ReactFlowInstance<MapNode>) => void;
  compact?: boolean;
  moving?: boolean;
  actor?: string;
  onInspect?: (id: string, rect: DOMRect, pinned: boolean) => void;
  onLeave?: () => void;
}) {
  const reduced = useReducedMotionPreference();
  const [hovered, setHovered] = useState("");
  const [flow, setFlow] = useState<ReactFlowInstance<MapNode> | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const press = useRef<{
    id: string;
    element: HTMLElement;
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  function inspectElement(element: HTMLElement) {
    const id = element.dataset.id;
    if (!id) return;
    onSelect(id);
    onInspect?.(id, element.getBoundingClientRect(), true);
  }
  const focus = hovered || (moving ? actor : selected);
  const related = supportRelations[focus] ?? [];
  const crossSource = supportRelations[focus]
    ? focus === "support"
      ? "evaluation"
      : focus
    : "evaluation";
  const fit = useCallback(() => {
    if (!flow || !canvas.current) return;
    const { width, height } = canvas.current.getBoundingClientRect();
    if (!width || !height) return;
    const zoom = Math.min(1.1, (width - 28) / 790, (height - 28) / 620);
    void flow.setViewport(
      { x: (width - 790 * zoom) / 2, y: (height - 620 * zoom) / 2, zoom },
      { duration: 0 },
    );
  }, [flow]);
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(fit);
    observer.observe(canvas.current);
    const frame = requestAnimationFrame(fit);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [fit]);
  const nodes: MapNode[] = useMemo(
    () =>
      specs.map((s) => ({
        id: s.id,
        type: s.group ? "groupObject" : "object",
        position: { x: s.x, y: s.y },
        parentId: s.parent,
        style: { width: s.w, height: s.h },
        data: {
          label: objectById(s.id).name,
          objectId: s.id,
          active: s.id === selected,
          related:
            related.includes(s.id) ||
            specs.find((n) => n.id === selected)?.parent === s.id,
          tone: toneOf(s.id),
          live: !reduced && moving && actor === s.id,
        },
        draggable: false,
        connectable: false,
        ariaLabel: `${objectById(s.id).name}，查看定义与作用`,
      })),
    [selected, focus, moving, actor, reduced],
  );
  const edges: Edge[] = useMemo(() => {
    const base = [
      {
        id: "m-h",
        source: "model",
        target: "harness",
        sourceHandle: "rs",
        targetHandle: "lt",
        label: "判断与动作建议",
      },
      {
        id: "h-m",
        source: "harness",
        target: "model",
        sourceHandle: "ls",
        targetHandle: "rt",
        label: "任务信息与反馈",
      },
      {
        id: "h-e",
        source: "harness",
        target: "environment",
        sourceHandle: "bs",
        targetHandle: "tt",
        label: "执行与反馈",
      },
    ].map((e, i) => ({
      ...e,
      type: "signal",
      data: {
        moving:
          !reduced && moving && (e.source === actor || e.target === actor),
        color: ["#7766cf", "#397ac7", "#218d86"][i],
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: ["#8c79cf", "#658dce", "#62a7a0"][i],
      },
      style: { stroke: ["#9a8bd3", "#7d9ed1", "#7cb1aa"][i], strokeWidth: 2 },
      labelStyle: { fill: "#53627b", fontSize: 12 },
      labelBgStyle: { fill: "#f9fafc" },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 4,
    }));
    const targets = related.length
      ? related.filter((id) => ["model", "harness", "environment"].includes(id))
      : ["harness"];
    const feedback = targets.map((target, index) => ({
      id: `feedback-${crossSource}-${target}`,
      source: crossSource,
      target,
      sourceHandle: "feedback",
      targetHandle: target === "model" ? "feedback-top" : "feedback-right",
      type: "signal",
      data: {
        feedback: true,
        channel: 694 + index * 24,
        bottom: 566 + index * 15,
        moving: !reduced && moving && related.length > 0,
        color: "#b58c46",
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#bc9657" },
      style: {
        stroke: "#bc9657",
        strokeWidth: related.length ? 2 : 1.4,
        strokeDasharray: "5 5",
        opacity: related.length ? 1 : 0.5,
      },
    }));
    return [...base, ...feedback];
  }, [focus, moving, actor, reduced, crossSource]);
  return (
    <div
      ref={canvas}
      className={`map-canvas ${compact ? "compact-map" : ""}`}
      data-related={related.join(" ")}
      onPointerDownCapture={(event) => {
        const element = (event.target as HTMLElement).closest<HTMLElement>(
          ".react-flow__node",
        );
        const id = element?.dataset.id;
        if (!element || !id || event.button !== 0) return;
        press.current = {
          id, element, pointerId: event.pointerId,
          x: event.clientX, y: event.clientY,
        };
      }}
      onPointerUpCapture={(event) => {
        const start = press.current;
        press.current = null;
        if (!start || start.pointerId !== event.pointerId) return;
        // React Flow can capture pointer-up on its pane. Keep the original
        // node, but do not treat a drag/scroll as a tap.
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6) {
          const element = canvas.current?.querySelector<HTMLElement>(
            `.react-flow__node[data-id="${CSS.escape(start.id)}"]`,
          );
          inspectElement(element ?? start.element);
        }
      }}
      onPointerCancelCapture={() => { press.current = null; }}
      onClickCapture={(event) => {
        // Assistive technology may activate a node without pointer events.
        if (event.detail !== 0) return;
        const element = (event.target as HTMLElement).closest<HTMLElement>(
          ".react-flow__node",
        );
        const id = element?.dataset.id;
        if (!element || !id) return;
        event.stopPropagation();
        inspectElement(element);
      }}
      onFocusCapture={(event) => {
        const id = (event.target as HTMLElement).closest<HTMLElement>(
          ".react-flow__node",
        )?.dataset.id;
        if (id) setHovered(id);
      }}
      onBlurCapture={(event) => {
        if (!(event.relatedTarget instanceof Element) ||
            !event.relatedTarget.closest(".react-flow__node")) setHovered("");
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const element = (event.target as HTMLElement).closest<HTMLElement>(
          ".react-flow__node",
        );
        const id = element?.dataset.id;
        if (!element || !id) return;
        event.preventDefault();
        event.stopPropagation();
        inspectElement(element);
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeMouseEnter={(event, node) => {
          setHovered(node.id);
          onInspect?.(
            node.id,
            (event.currentTarget as HTMLElement).getBoundingClientRect(),
            false,
          );
        }}
        onNodeMouseLeave={() => {
          setHovered("");
          onLeave?.();
        }}
        onInit={(instance) => {
          setFlow(instance);
          onReady?.(instance);
        }}
        minZoom={0.25}
        maxZoom={1.8}
        autoPanOnNodeFocus={false}
        panOnDrag={false}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="#dce3ed" gap={22} size={1} />
        <Controls showInteractive={false} showFitView={false}>
          <ControlButton
            onClick={fit}
            title="显示全部对象"
            aria-label="显示全部对象"
          >
            <Maximize2 size={15} />
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  );
}

export function MapSection({
  selected,
  setSelected,
  onLearn,
}: {
  selected: string;
  setSelected: (s: string) => void;
  onLearn: (s: string) => void;
}) {
  const reduced = useReducedMotionPreference();
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [tick, setTick] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const visible = usePlaybackVisibility(root);
  const [popup, setPopup] = useState<{
    id: string;
    left: number;
    top: number;
    pinned: boolean;
  } | null>(null);
  const popupRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stage = stages[tick];
  const inspected = popup ? objectById(popup.id) : null;
  const object = objectById(selected);
  const selectedRelation = supportRelations[selected];
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setInterval(
      () => setTick((t) => (t + 1) % stages.length),
      2800,
    );
    return () => clearInterval(timer);
  }, [playing, visible]);
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!popup) return;
    const outside = (event: PointerEvent) => {
      if (
        !popupRef.current?.contains(event.target as globalThis.Node) &&
        !(event.target as HTMLElement).closest(".react-flow__node")
      )
        setPopup(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopup(null);
    };
    const scroll = (event: Event) => {
      if (!popupRef.current?.contains(event.target as globalThis.Node))
        setPopup(null);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [!!popup]);
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function select(id: string) {
    setSelected(id);
    setPlaying(false);
  }
  function inspect(id: string, rect: DOMRect, pinned: boolean) {
    cancelClose();
    setPopup((previous) => {
      if (previous?.pinned && !pinned) return previous;
      const width = Math.min(292, innerWidth - 24);
      const left = Math.max(
        12,
        Math.min(rect.right + 12, innerWidth - width - 12),
      );
      const top = Math.max(72, Math.min(rect.top, innerHeight - 330));
      return { id, left, top, pinned };
    });
    if (pinned) select(id);
  }
  function leave() {
    cancelClose();
    closeTimer.current = setTimeout(
      () => setPopup((p) => (p?.pinned ? p : null)),
      220,
    );
  }
  return (
    <div ref={root} className="map-experience outline-object-map">
      <div className="map-toolbar">
        <div className="map-legend">
          <span className="legend-violet">模型</span>
          <span className="legend-blue">Harness</span>
          <span className="legend-teal">环境</span>
          <span className="legend-amber">改进支撑</span>
        </div>
        <div className="map-play-controls">
          <button
            onClick={() => {
              setTick(0);
              setPlaying(!reduced);
              setPopup(null);
            }}
            aria-label="从头演示对象协作"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => {
              setPlaying(!playing);
              setPopup(null);
            }}
            className="map-play"
            disabled={!!reduced}
            aria-pressed={playing}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}{" "}
            {playing ? "暂停动画" : "继续动画"}
          </button>
        </div>
      </div>
      <div className="map-principles-layout">
        <div className="map-primary">
          <ObjectMap
            selected={selected}
            onSelect={select}
            moving={playing && visible && !reduced}
            actor={stage.id}
            onInspect={inspect}
            onLeave={leave}
          />
          <div className="map-stage-caption" aria-live="off">
            <strong>
              {playing
                ? stage.title
                : selectedRelation
                  ? object.name
                  : "查看对象关系"}
            </strong>
            <span>
              {playing
                ? stage.detail
                : selectedRelation
                  ? "上方已强调相关对象，虚线表示改进关联。"
                  : "点击下方改进支撑对象，可查看与上方对象的关联。"}
            </span>
          </div>
          <div className="map-bottom-tools">
            <details className="map-list">
              <summary>查看对象列表</summary>
              <div>
                {objects
                  .filter((o) => o.id !== "system")
                  .map((o) => (
                    <button
                      key={o.id}
                      onClick={(event) =>
                        inspect(
                          o.id,
                          event.currentTarget.getBoundingClientRect(),
                          true,
                        )
                      }
                      className={selected === o.id ? "selected" : ""}
                    >
                      {o.name}
                    </button>
                  ))}
              </div>
            </details>
            <Modal
              title="优化对象与关系"
              description="实线表示运行中的信息交接，虚线表示跨对象改进关联。"
              trigger={<button className="map-expand">展开地图</button>}
            >
              <div className="expanded-map">
                <ObjectMap selected={selected} onSelect={select} />
                <div className="expanded-map-caption">
                  <strong>{object.name}</strong>
                  <p>{object.definition}</p>
                  <p>{object.purpose}</p>
                  <Button
                    disabled={selected !== "model"}
                    onClick={() => onLearn("model")}
                  >
                    {selected === "model" ? "进入模型优化" : "对应内容待开放"}
                  </Button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
        <aside className="map-principles" aria-label="三条调优经验">
          <h3>三条调优经验</h3>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>先检查输入和执行机制</strong>
                <p>先看信息与执行是否符合预期，再决定是否调整模型。</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>一次尽量只改一个对象</strong>
                <p>保留对照，检查当前步骤和完整任务是否改善。</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>先查清现有机制</strong>
                <p>确认已有机制如何工作，再考虑新增能力。</p>
              </div>
            </li>
          </ol>
          <p className="map-line-key">
            <span />
            运行信息交接
            <br />
            <span />
            跨对象改进关联
          </p>
        </aside>
      </div>
      {createPortal(
        <AnimatePresence>
          {popup && inspected && (
            <motion.aside
              ref={popupRef}
              key={popup.id}
              className={`object-popover tone-${toneOf(popup.id)}`}
              style={{ left: popup.left, top: popup.top }}
              role="dialog"
              aria-modal="false"
              aria-label={`${inspected.name}定义与作用`}
              onMouseEnter={cancelClose}
              onMouseLeave={leave}
              initial={reduced ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <header>
                <h3>{inspected.name}</h3>
                <button
                  className="icon-btn"
                  aria-label="关闭对象说明"
                  onClick={() => setPopup(null)}
                >
                  <X size={15} />
                </button>
              </header>
              <h4>定义</h4>
              <p>{inspected.definition}</p>
              <h4>作用</h4>
              <p>{inspected.purpose}</p>
              <Button
                variant="secondary"
                disabled={popup.id !== "model"}
                onClick={() => {
                  setPopup(null);
                  onLearn("model");
                }}
              >
                {popup.id === "model" ? "进入模型优化" : "对应内容待开放"}
                <ChevronRight size={14} />
              </Button>
            </motion.aside>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
