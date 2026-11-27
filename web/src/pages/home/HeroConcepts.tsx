import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Map,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { chapters, type Chapter } from "../../domain/curriculum";
import {
  usePlaybackVisibility,
  useReducedMotionPreference,
} from "../../components/usePlaybackVisibility";

type Concept = "book" | "map" | "archive";
const concepts: { id: Concept; title: string; description: string }[] = [
  { id: "book", title: "立体书", description: "展开封面，按真实章节翻阅。" },
  {
    id: "map",
    title: "主线地图",
    description: "按章节顺序演示，点击地图可随时选章。",
  },
  {
    id: "archive",
    title: "章节档案",
    description: "展开章节页，从叠层中抽出一页内容。",
  },
];
const chapterNumber = (chapter: Chapter) =>
  String(chapter.number).padStart(2, "0");
const chapterStatus = (chapter: Chapter) =>
  chapter.status === "planned"
    ? "章节待补充"
    : chapter.status === "intro"
      ? "已有基础内容"
      : "可阅读";
const spring = { type: "spring" as const, stiffness: 210, damping: 27 };

export function HeroConcepts({
  concept,
  compare = false,
  go,
}: {
  concept?: string;
  compare?: boolean;
  go: (path: string) => void;
}) {
  const current = concepts.find((c) => c.id === concept) ?? concepts[1];
  const surface = useRef<HTMLDivElement>(null),
    visible = usePlaybackVisibility(surface),
    reduced = useReducedMotionPreference();
  const [index, setIndex] = useState(0),
    [manual, setManual] = useState(false),
    [paused, setPaused] = useState(false),
    [hover, setHover] = useState(false),
    [focus, setFocus] = useState(false),
    [replay, setReplay] = useState(0);
  const playing =
      visible &&
      !reduced &&
      !manual &&
      !paused &&
      (current.id === "map" || !hover) &&
      !focus,
    chapter = chapters[index];
  useEffect(() => {
    if (!playing || current.id === "map") return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % chapters.length),
      4200,
    );
    return () => clearInterval(timer);
  }, [playing, current.id, replay]);
  function select(value: number) {
    setIndex(value);
    setManual(true);
  }
  function restart() {
    setIndex(0);
    setManual(false);
    setPaused(false);
    setReplay((n) => n + 1);
  }
  function open() {
    if (chapter.href) {
      go(chapter.href);
      return;
    }
    const item = document.querySelector<HTMLElement>(
      `#chapters [data-chapter="${chapter.id}"]`,
    );
    item?.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "center",
    });
    if (item) {
      item.tabIndex = -1;
      item.focus({ preventScroll: true });
    }
  }
  return (
    <section
      className={`hero-concepts hc-${current.id}`}
      ref={surface}
      data-concept={current.id}
      aria-label={current.id === "map" ? "全书章节地图" : "全书章节导览"}
    >
      {compare && (
        <div className="hc-concept-tabs" role="tablist" aria-label="主视觉方案">
          {concepts.map((item) => (
            <button
              role="tab"
              key={item.id}
              aria-selected={current.id === item.id}
              onClick={() => go("/?home=3&compare=1&concept=" + item.id)}
            >
              {item.id === "book" ? (
                <BookOpen size={14} />
              ) : item.id === "map" ? (
                <Map size={14} />
              ) : (
                <Layers3 size={14} />
              )}
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      )}
      <div
        className="hc-art"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocusCapture={() => setFocus(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
        }}
      >
        {current.id === "book" ? (
          <BookGuide
            index={index}
            select={select}
            replay={replay}
            reduced={reduced}
          />
        ) : current.id === "map" ? (
          <ChapterMap
            index={index}
            select={select}
            replay={replay}
            reduced={reduced}
            playing={playing}
            manual={manual}
            advance={setIndex}
          />
        ) : (
          <ChapterArchive
            index={index}
            select={select}
            replay={replay}
            reduced={reduced}
            expanded={hover || focus}
          />
        )}
      </div>
      {(current.id !== "map" || compare) && (
        <div className="hc-chapter-index" aria-label="按章节选择">
          {chapters.map((item, i) => (
            <button
              key={item.id}
              title={item.title}
              aria-label={"选择第" + item.number + "章 " + item.title}
              aria-pressed={index === i}
              onClick={() => select(i)}
            >
              {current.id === "archive" && index === i && (
                <motion.span
                  layoutId="archive-selected"
                  className="hc-index-cursor"
                  transition={reduced ? { duration: 0 } : spring}
                />
              )}
              <span>{chapterNumber(item)}</span>
            </button>
          ))}
          <span>按章节阅读 · 支持跳读</span>
        </div>
      )}
      {current.id === "map" ? (
        <div className="hc-map-footer" aria-live={manual ? "polite" : "off"}>
          <span
            className="hc-map-chapter-number"
            aria-label={`第${chapter.number}章`}
          >
            {chapterNumber(chapter)}
          </span>
          <div className="hc-map-chapter-copy">
            <div className="hc-map-chapter-heading">
              <h2>{chapter.title}</h2>
              <span>{chapterStatus(chapter)}</span>
            </div>
            <p>{chapter.description}</p>
            <button className="hc-map-read" onClick={open}>
              {chapter.href ? "阅读本章" : "查看章节规划"}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="hc-map-playback">
            {!reduced && (
              <span>{paused || manual || focus ? "已暂停" : "自动导览"}</span>
            )}
            <button onClick={restart} aria-label="重新演示" title="重新演示">
              <RotateCcw size={15} />
            </button>
            {!reduced && (
              <button
                aria-label={paused || manual ? "播放自动演示" : "暂停自动演示"}
                title={paused || manual ? "播放自动演示" : "暂停自动演示"}
                onClick={() => {
                  if (paused || manual) {
                    setPaused(false);
                    setManual(false);
                  } else setPaused(true);
                }}
              >
                {paused || manual ? <Play size={15} /> : <Pause size={15} />}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            className="hc-chapter-caption"
            aria-live={manual ? "polite" : "off"}
          >
            <div>
              <strong>{chapter.title}</strong>
              <p>{chapter.description}</p>
              <small>{chapterStatus(chapter)}</small>
            </div>
            <button onClick={open}>
              {chapter.href ? "阅读本章" : "查看章节规划"}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="hc-controls">
            <span>{current.description}</span>
            <div>
              <button onClick={restart} aria-label="重新演示" title="重新演示">
                <RotateCcw size={13} />
              </button>
              {!reduced && (
                <button
                  aria-label={
                    paused || manual ? "播放自动演示" : "暂停自动演示"
                  }
                  title={paused || manual ? "播放自动演示" : "暂停自动演示"}
                  onClick={() => {
                    if (paused || manual) {
                      setPaused(false);
                      setManual(false);
                    } else setPaused(true);
                  }}
                >
                  {paused || manual ? <Play size={13} /> : <Pause size={13} />}
                </button>
              )}
              {compare && (
                <a href="#/?home=3&concept=original">
                  对照上一版
                  <ArrowUpRight size={11} />
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function BookGuide({
  index,
  select,
  replay,
  reduced,
}: {
  index: number;
  select: (i: number) => void;
  replay: number;
  reduced: boolean;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (reduced || replay === 0) {
      setOpen(true);
      return;
    }
    setOpen(false);
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, [replay, reduced]);
  const chapter = chapters[index];
  return (
    <div className={`hc-book-stage ${open ? "is-open" : ""}`}>
      <div className="hc-book-ground" />
      <div className="hc-book-perspective">
        <div className="hc-book-volume">
          <div className="hc-book-page-edges" />
          <div className="hc-book-backboard" />
          <div className="hc-book-left" inert={!open}>
            <span className="hc-page-heading">章节目录</span>
            <p>一条主线，七个章节。</p>
            <ol>
              {chapters.map((item, i) => (
                <li key={item.id}>
                  <button
                    onClick={() => select(i)}
                    aria-label={"翻到" + item.title}
                    aria-pressed={index === i}
                  >
                    <span>{chapterNumber(item)}</span>
                    <strong>{item.title}</strong>
                  </button>
                </li>
              ))}
            </ol>
            <span className="hc-book-page-number">技术指南</span>
          </div>
          <div className="hc-book-right" inert={!open}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={chapter.id}
                className="hc-book-page-content"
                initial={reduced ? false : { rotateY: 65, opacity: 0.3 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={reduced ? { opacity: 1 } : { rotateY: -75, opacity: 0 }}
                transition={{
                  duration: reduced ? 0 : 0.48,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="hc-page-number-large">
                  {chapterNumber(chapter)}
                </span>
                <h2>{chapter.title}</h2>
                <p>{chapter.description}</p>
                <div className="hc-book-topics">
                  {chapter.topics.map((topic) => (
                    <span key={topic}>{topic}</span>
                  ))}
                </div>
                <small>{chapterStatus(chapter)}</small>
              </motion.div>
            </AnimatePresence>
            <span className="hc-book-ribbon" />
            <span className="hc-book-page-number">
              {index + 1} / {chapters.length}
            </span>
            <button
              className="hc-page-corner"
              aria-label="翻到下一章"
              onClick={() => select((index + 1) % chapters.length)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
          <button
            className="hc-book-cover"
            onClick={() => setOpen(true)}
            tabIndex={open ? -1 : 0}
            aria-label="展开指南封面"
            aria-hidden={open}
          >
            <span className="hc-cover-binding" />
            <span className="hc-cover-mark">
              <BookOpen size={30} />
            </span>
            <strong>
              智能体调优
              <br />
              技术指南
            </strong>
            <span className="hc-cover-rule" />
            <span className="hc-cover-subtitle">
              医疗设备智能体
              <br />
              方法与实践
            </span>
            <span className="hc-cover-bottom">
              从前言，到方法与验证
              <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </div>
      <button
        className="hc-book-reopen"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "合上书本" : "展开指南"}
        <BookOpen size={13} />
      </button>
    </div>
  );
}

const mapPoints = [
  { x: 93, y: 316 },
  { x: 128, y: 219 },
  { x: 280, y: 96 },
  { x: 458, y: 129 },
  { x: 540, y: 253 },
  { x: 384, y: 337 },
  { x: 219, y: 360 },
];
const compactPoints = [
  { x: 64, y: 350 },
  { x: 70, y: 220 },
  { x: 80, y: 70 },
  { x: 246, y: 90 },
  { x: 265, y: 225 },
  { x: 242, y: 360 },
  { x: 152, y: 430 },
];
const route =
  "M93 316C54 278 64 246 128 219S210 74 280 96S408 76 458 129S581 203 540 253S460 301 384 337S278 401 219 360";
const compactRoute =
  "M64 350C24 301 36 255 70 220S28 105 80 70S192 36 246 90S309 170 265 225S296 309 242 360S211 453 152 430";
function ChapterMap({
  index,
  select,
  replay,
  reduced,
  playing,
  manual,
  advance,
}: {
  index: number;
  select: (i: number) => void;
  replay: number;
  reduced: boolean;
  playing: boolean;
  manual: boolean;
  advance: (index: number) => void;
}) {
  const [compact, setCompact] = useState(
      () => window.matchMedia("(max-width: 600px)").matches,
    ),
    plane = useRef<HTMLDivElement>(null),
    basePath = useRef<SVGPathElement>(null);
  const [fractions, setFractions] = useState([
    0, 0.14, 0.36, 0.55, 0.72, 0.86, 1,
  ]);
  const progress = useMotionValue(0);
  const travelerX = useTransform(progress, (value) => {
    const element = basePath.current;
    return element
      ? element.getPointAtLength(element.getTotalLength() * value).x
      : 0;
  });
  const travelerY = useTransform(progress, (value) => {
    const element = basePath.current;
    return element
      ? element.getPointAtLength(element.getTotalLength() * value).y
      : 0;
  });
  useEffect(() => {
    const media = window.matchMedia("(max-width: 600px)");
    const changed = () => setCompact(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const points = compact ? compactPoints : mapPoints,
    path = compact ? compactRoute : route;
  useEffect(() => {
    const element = basePath.current;
    if (!element) return;
    const length = element.getTotalLength();
    const position = element.getPointAtLength(length * progress.get());
    travelerX.set(position.x);
    travelerY.set(position.y);
    setFractions(
      points.map((target) => {
        let nearest = 0,
          distance = Infinity;
        for (let n = 0; n <= 480; n++) {
          const point = element.getPointAtLength((length * n) / 480);
          const d = (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
          if (d < distance) {
            distance = d;
            nearest = n / 480;
          }
        }
        return nearest;
      }),
    );
  }, [compact, progress, travelerX, travelerY]);
  useEffect(() => {
    progress.set(0);
  }, [replay, progress]);
  useEffect(() => {
    if (!manual && !reduced) return;
    const control = animate(progress, fractions[index], {
      duration: reduced ? 0 : 0.55,
      ease: "easeOut",
    });
    return () => control.stop();
  }, [manual, reduced, index, fractions, progress]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      previous: number | undefined,
      atEnd = 0,
      activeChapter = -1;
    const tick = (time: number) => {
      const elapsed =
        previous === undefined ? 0 : Math.min(time - previous, 64);
      previous = time;
      let value = progress.get();
      if (value >= 1) {
        atEnd += elapsed;
        if (atEnd >= 1000) {
          value = 0;
          atEnd = 0;
        }
      } else value = Math.min(1, value + elapsed / 28000);
      progress.set(value);
      let active = 0;
      fractions.forEach((fraction, i) => {
        if (value >= fraction) active = i;
      });
      if (active !== activeChapter) {
        advance(active);
        activeChapter = active;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, fractions, progress, advance]);
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const r = event.currentTarget.getBoundingClientRect();
    plane.current?.style.setProperty(
      "--map-ry",
      ((event.clientX - r.left) / r.width) * 8 - 4 + "deg",
    );
    plane.current?.style.setProperty(
      "--map-rx",
      -((event.clientY - r.top) / r.height) * 6 + 3 + "deg",
    );
  }
  return (
    <div
      className="hc-map-stage"
      onPointerMove={tilt}
      onPointerLeave={() => {
        plane.current?.style.setProperty("--map-rx", "0deg");
        plane.current?.style.setProperty("--map-ry", "0deg");
      }}
    >
      <div className="hc-map-plane" ref={plane}>
        <svg
          viewBox={compact ? "0 0 340 480" : "0 0 650 420"}
          preserveAspectRatio="none"
          fill="none"
          className="hc-map-drawing"
          aria-hidden="true"
        >
          <polygon
            className="hc-map-shadow"
            points={
              compact
                ? "21,105 164,40 320,105 326,395 172,480 24,395"
                : "35,173 219,76 401,63 613,186 603,309 413,403 214,417 40,317"
            }
          />
          <polygon
            className="hc-map-paper"
            points={
              compact
                ? "21,90 164,25 320,90 326,380 172,466 24,380"
                : "35,158 219,61 401,48 613,171 603,294 413,388 214,402 40,302"
            }
          />
          <path
            className="hc-map-fold"
            d={
              compact
                ? "M164 25V466M21 245L326 240"
                : "M219 61L214 402M401 48L413 388M35 230L603 236"
            }
          />
          <polygon
            className="hc-map-face-left"
            points={
              compact
                ? "21,90 164,25 164,466 24,380"
                : "35,158 219,61 214,402 40,302"
            }
          />
          <polygon
            className="hc-map-face-right"
            points={
              compact
                ? "164,25 320,90 326,380 164,466"
                : "401,48 613,171 603,294 413,388"
            }
          />
          <path
            className="hc-map-contour"
            d={
              compact
                ? "M40 125Q140 65 290 125M38 150Q150 88 291 150M43 176Q150 120 287 176M46 410Q170 454 295 402"
                : "M75 176Q237 71 379 90Q452 100 563 177M75 197Q235 97 375 115Q459 124 564 196M75 218Q235 123 374 139Q459 149 564 216M106 312Q288 393 504 300M129 333Q290 406 476 329"
            }
          />
          <path ref={basePath} d={path} className="hc-map-route" />
          <motion.path
            key={replay + "-" + compact}
            d={path}
            className="hc-map-progress"
            style={{ pathLength: progress }}
          />
          <motion.circle
            className="hc-map-traveler"
            cx={travelerX}
            cy={travelerY}
            r="5"
          />
        </svg>
        {chapters.map((item, i) => (
          <motion.button
            key={item.id}
            className={`hc-map-stop ${index === i ? "is-current" : ""}`}
            style={{
              x: "-50%",
              left: (points[i].x / (compact ? 340 : 650)) * 100 + "%",
              top: (points[i].y / (compact ? 480 : 420)) * 100 + "%",
            }}
            animate={{ y: -14 }}
            transition={reduced ? { duration: 0 } : spring}
            onClick={() => select(i)}
            aria-label={"地图选择" + item.title}
            aria-pressed={index === i}
          >
            <span>{chapterNumber(item)}</span>
            <strong>{item.title}</strong>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

const archiveColors = [
  "#eff1f8",
  "#e3ebf8",
  "#e5eee5",
  "#f3e6db",
  "#e7e4f1",
  "#e3eeee",
  "#f1e9d9",
];
function ChapterArchive({
  index,
  select,
  replay,
  reduced,
  expanded,
}: {
  index: number;
  select: (i: number) => void;
  replay: number;
  reduced: boolean;
  expanded: boolean;
}) {
  const chapter = chapters[index];
  return (
    <div className={`hc-archive-stage ${expanded ? "is-expanded" : ""}`}>
      <div className="hc-archive-title">
        <span>每一章，都是一页可取用的方法。</span>
        <Layers3 size={21} />
      </div>
      <div className="hc-archive-cabinet" key={replay}>
        {chapters.map((item, i) => {
          const active = i === index,
            distance = i - index;
          return (
            <motion.button
              key={item.id}
              aria-label={"抽出" + item.title}
              aria-pressed={active}
              className={`hc-dossier ${active ? "is-front" : ""}`}
              style={
                {
                  "--sheet-color": archiveColors[i],
                  zIndex: active ? 20 : 7 - Math.abs(distance),
                } as CSSProperties
              }
              animate={{
                x: active ? 0 : (i - 3) * (expanded ? 39 : 20),
                y: active ? -9 : -Math.abs(i - 3) * (expanded ? 8 : 4) - 5,
                rotate: active ? -2 : (i - 3) * (expanded ? 6 : 3),
                scale: active ? 1 : expanded ? 0.91 : 0.94,
              }}
              transition={reduced ? { duration: 0 } : spring}
              onClick={() => select(i)}
            >
              <span className="hc-dossier-tab">
                {chapterNumber(item)}
                <span>{item.navTitle}</span>
              </span>
              <span className="hc-dossier-paper">
                <span className="hc-dossier-number">{chapterNumber(item)}</span>
                <strong>{item.title}</strong>
                <span className="hc-dossier-description">
                  {item.description}
                </span>
                <span className="hc-dossier-footer">
                  {chapterStatus(item)}
                  <ArrowUpRight size={16} />
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="hc-archive-browse">
        <button aria-label="上一章节" onClick={() => select((index + 6) % 7)}>
          <ChevronLeft size={16} />
        </button>
        <span>
          {chapterNumber(chapter)}
          <i />
          七章调优指南
        </span>
        <button aria-label="下一章节" onClick={() => select((index + 1) % 7)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
