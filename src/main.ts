const app = document.querySelector<HTMLElement>("#app")!;

const heading = document.createElement("h1");
heading.textContent = "CMPM 170 Project 2 Group 18";

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
canvas.style.border = "2px solid #000000";

app.append(heading, canvas);

const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };

interface Point {
  x: number;
  y: number;
}

interface Command {
  draw(ctx: CanvasRenderingContext2D): void;
}

class LineCommand implements Command {
  points: Point[] = [];
  constructor(
    public color: string,
    public thickness: number,
    startX: number,
    startY: number,
  ) {
    this.points.push({ x: startX, y: startY });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.thickness;
      const { x, y } = this.points[0];
      ctx.moveTo(x, y);
      for (const { x, y } of this.points) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

const commands: Command[] = [];
const redoStack: Command[] = [];
let currentLine: LineCommand | null = null;
let currentThickness = 2;
let currentColor = "#000000";

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of commands) {
    cmd.draw(ctx);
  }
}

const markersDiv = document.createElement("div");
markersDiv.style.marginBottom = "10px";
markersDiv.style.display = "flex";
markersDiv.style.alignItems = "center";
markersDiv.style.flexWrap = "wrap";
app.append(markersDiv);

const colorsDiv = document.createElement("div");
colorsDiv.style.marginBottom = "10px";
colorsDiv.style.display = "flex";
colorsDiv.style.alignItems = "center";
colorsDiv.style.flexWrap = "wrap";
app.append(colorsDiv);

function createDrawingButton(
  symbol: string,
  onClick: (btn: HTMLButtonElement) => void,
  color = "#000000",
  div: HTMLDivElement,
) {
  const btn = document.createElement("button");
  btn.innerHTML = symbol;
  btn.style.fontSize = "24px";
  btn.style.margin = "0 4px";
  btn.style.background = "transparent";
  btn.style.border = "1px solid #000000";
  btn.style.borderRadius = "4px";
  btn.style.cursor = "pointer";
  btn.style.color = color;
  btn.style.width = "48px";
  btn.style.height = "48px";
  btn.style.padding = "0";
  btn.style.display = "inline-flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.onclick = () => onClick(btn);
  div.append(btn);
  return btn;
}

let activeMarkerBtn: HTMLButtonElement | null = null;
let activeColorBtn: HTMLButtonElement | null = null;

function selectMarker(btn: HTMLButtonElement, thickness: number) {
  if (activeMarkerBtn) activeMarkerBtn.style.background = "transparent";
  btn.style.background = "#e0e0e0";
  activeMarkerBtn = btn;
  currentThickness = thickness;
}

function selectColor(btn: HTMLButtonElement, color: string) {
  if (activeColorBtn) activeColorBtn.style.background = "transparent";
  btn.style.background = "#e0e0e0";
  activeColorBtn = btn;
  currentColor = color;
}

const thinMarker = createDrawingButton(
  "⊙",
  (btn) => selectMarker(btn, 2),
  "#000000",
  markersDiv,
);
createDrawingButton(
  "◉",
  (btn) => selectMarker(btn, 6),
  "#000000",
  markersDiv,
);
selectMarker(thinMarker, 2);

const colors = ["#000000", "#FF0000", "#0000FF", "#008000"];
for (const color of colors) {
  const btn = createDrawingButton(
    "⬤",
    (btn) => selectColor(btn, color),
    color,
    colorsDiv,
  );
  if (color === "#000000") selectColor(btn, color);
}

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  redoStack.splice(0, redoStack.length);
  currentLine = new LineCommand(
    currentColor,
    currentThickness,
    e.offsetX,
    e.offsetY,
  );
  commands.push(currentLine);

  redraw();
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentLine?.points.push({ x: e.offsetX, y: e.offsetY });
    redraw();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentLine = null;
  redraw();
});

const controlsDiv = document.createElement("div");
app.append(controlsDiv);

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
controlsDiv.append(undoButton);

undoButton.addEventListener("click", () => {
  if (commands.length > 0) {
    redoStack.push(commands.pop()!);
    redraw();
  }
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
controlsDiv.append(redoButton);

redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    commands.push(redoStack.pop()!);
    redraw();
  }
});

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
controlsDiv.append(clearButton);

clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  redraw();
});
