import "./style.css";

const app = document.querySelector<HTMLElement>("#app")!;

const heading = document.createElement("h1");
heading.textContent = "Scribble Clones";
app.append(heading);

// game state variables
let totalPlayers = 0;
let currentPlayer = 1;
let currentRound = 1;
let playerDrawings: Command[][] = [];
const prompts = ["a snowman", "a panda", "a turkey"];
let currentPrompt = "";
let similarities: number | null = null;
const DRAW_TIME = 45;
const SWITCH_TIME = 5;

//used for possible playtesting with different paramaters
type testMode = "original" | "test";
let testMode: testMode = "original";

type JudgeDecision = "green" | "yellow" | "red";
interface ColorFeedback{
  shape: JudgeDecision;
  color: JudgeDecision;
  position: JudgeDecision;
  size: JudgeDecision;
}

let previousFeedback: ColorFeedback | null = null;

// view containers
const setupView = document.createElement("div");
const drawView = document.createElement("div");
const switchView = document.createElement("div");
const judgeView = document.createElement("div");

setupView.className = "game-view setup-view";
drawView.className = "game-view";
switchView.className = "game-view";
judgeView.className = "game-view";

function showView(view: HTMLDivElement) {
  [setupView, drawView, switchView, judgeView].forEach((v) =>
    v.style.display = "none"
  );
  view.style.display = "block";
}

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
canvas.style.border = "2px solid #000000";
drawView.append(canvas);

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
    public isEraser: boolean = false,
  ) {
    this.points.push({ x: startX, y: startY });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length > 0) {
      if (this.isEraser) ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.thickness;
      const { x, y } = this.points[0];
      ctx.moveTo(x, y);
      for (const { x, y } of this.points) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (this.isEraser) ctx.globalCompositeOperation = "source-over";
    }
  }
}

class CircleCommand implements Command {
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(256, 256, 100, 0, 2 * Math.PI);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

const commands: Command[] = [];
const redoStack: Command[] = [];
let currentLine: LineCommand | null = null;
let currentThickness = 2;
let currentColor = "#000000";
let currentTool: "marker" | "eraser" = "marker";

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of commands) {
    cmd.draw(ctx);
  }
}

// buttons
const markersDiv = document.createElement("div");
markersDiv.style.marginBottom = "10px";
markersDiv.style.display = "flex";
markersDiv.style.alignItems = "center";
markersDiv.style.flexWrap = "wrap";
drawView.append(markersDiv);

const colorsDiv = document.createElement("div");
colorsDiv.style.marginBottom = "10px";
colorsDiv.style.display = "flex";
colorsDiv.style.alignItems = "center";
colorsDiv.style.flexWrap = "wrap";
drawView.append(colorsDiv);

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

function selectTool(
  btn: HTMLButtonElement,
  tool: "marker" | "eraser",
  thickness: number,
) {
  if (activeMarkerBtn) activeMarkerBtn.style.background = "transparent";
  btn.style.background = "#e0e0e0";
  activeMarkerBtn = btn;
  currentThickness = thickness;
  currentTool = tool;
}

function selectColor(btn: HTMLButtonElement, color: string) {
  if (activeColorBtn) activeColorBtn.style.background = "transparent";
  btn.style.background = "#e0e0e0";
  activeColorBtn = btn;
  currentColor = color;
}

// eraser
createDrawingButton(
  "🧽",
  (btn) => selectTool(btn, "eraser", 18),
  "#000000",
  markersDiv,
);
// thin marker
const thinMarker = createDrawingButton(
  "⊙",
  (btn) => selectTool(btn, "marker", 2),
  "#000000",
  markersDiv,
);
// thick marker
createDrawingButton(
  "◉",
  (btn) => selectTool(btn, "marker", 6),
  "#000000",
  markersDiv,
);
selectTool(thinMarker, "marker", 2);
// custom marker
const customMarkerBtn = createDrawingButton(
  "◎",
  (btn) => selectTool(btn, "marker", Number(thicknessSlider.value)),
  "#000000",
  markersDiv,
);
const thicknessSlider = document.createElement("input");
thicknessSlider.type = "range";
thicknessSlider.min = "1";
thicknessSlider.max = "50";
thicknessSlider.value = "10";
thicknessSlider.style.margin = "0 10px";
thicknessSlider.oninput = () => {
  selectTool(customMarkerBtn, "marker", Number(thicknessSlider.value));
};
markersDiv.append(thicknessSlider);

// color buttons
const colors = ["#FF0000", "#0000FF", "#008000"];
const blackColor = createDrawingButton(
  "⬤",
  (btn) => selectColor(btn, "#000000"),
  "#000000",
  colorsDiv,
);
selectColor(blackColor, "#000000");
for (const color of colors) {
  createDrawingButton(
    "⬤",
    (btn) => selectColor(btn, color),
    color,
    colorsDiv,
  );
}
// custom color
const customColorPicker = document.createElement("input");
customColorPicker.type = "color";
customColorPicker.value = "#000000";
customColorPicker.style.margin = "0 10px";
customColorPicker.oninput = () => {
  selectColor(customColorBtn, customColorPicker.value);
  customColorBtn.style.color = customColorPicker.value;
};
colorsDiv.append(customColorPicker);
const customColorBtn = createDrawingButton(
  "⬤",
  (btn) => selectColor(btn, customColorPicker.value),
  "#000000",
  colorsDiv,
);

// drawing behavior
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
    currentTool === "eraser",
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
drawView.append(controlsDiv);

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
controlsDiv.append(undoButton);

undoButton.addEventListener("click", () => {
  if (commands.length > 1) { // accounting for first circle command
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
  commands.splice(1, commands.length - 1); // accounting for first circle command
  redraw();
});

// setup view
const rulesTitle = document.createElement("h2");
rulesTitle.textContent = "How To Play";
const rulesText = document.createElement("p");
rulesText.innerHTML = `
1. Select the number of players who will draw. One player not included will not draw and will be the judge.<br>
2. A random prompt will be given. The goal is to draw the prompt as accurately as possible. Every canvas starts with a circle.<br>
3. Each players is allotted ${DRAW_TIME} seconds to draw the prompt. Do not show other players your drawing.<br>
4. NEITHER PLAYERS NOR THE JUDGE ARE ALLOWED TO COMMUNICATE WITH EACH OTHER IN ANY WAY.<br>
5. Once a player's timer ends, the next player takes their turn. They have ${SWITCH_TIME} seconds to switch players.<br>
6. After all players draw, the judge will review all the drawings made that round.<br>
7. The judge must determine if all the drawings are the same i.e. having the same features. If yes, the players win the game. If no, the judge must reveal how many similarities, but not exactly what they are, that are found between all the drawings.<br>
8. The drawing phase begins again until the players win.
`;
rulesText.style.maxWidth = "400px";
rulesText.style.lineHeight = "1.5";

const playerInput = document.createElement("input");
playerInput.type = "number";
playerInput.min = "2";
playerInput.value = "3";

//Select playtest version
const modeSelect = document.createElement("select");
const originalOption = document.createElement("option");
originalOption.value = "original";
originalOption.textContent = "Original Mode";

const judgeOption = document.createElement("option");
judgeOption.value = "test";
judgeOption.textContent = "Test Mode (for playtesting)";

modeSelect.append(originalOption, judgeOption);

const startButton = document.createElement("button");
startButton.innerHTML = "Start";

const setupControls = document.createElement("div");
setupControls.className = "setup-controls";
const modeRow = document.createElement("div");
modeRow.className = "setup-row";
modeRow.append(
  document.createTextNode("Select mode: "),
  modeSelect,
);

const playerRow = document.createElement("div");
playerRow.className = "setup-row";
playerRow.append(
  document.createTextNode("How many players? (drawing only) "),
  playerInput,
  startButton
);

setupControls.append(modeRow, playerRow);


setupView.append(
  rulesTitle,
  rulesText,
  setupControls,
  //document.createTextNode("How many players? (drawing only) "),
  //playerInput,
  //startButton,
);
app.append(setupView, drawView, switchView, judgeView);

startButton.addEventListener("click", () => {
  totalPlayers = parseInt(playerInput.value);

  testMode = modeSelect.value as testMode;
  previousFeedback = null;

  currentPlayer = 1;
  currentRound = 1;
  similarities = null;
  playerDrawings = [];
  currentPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  startDrawingTurn();
});
showView(setupView);

// drawing and switching view
const timerDisplay = document.createElement("h2");
drawView.prepend(timerDisplay);

const switchMessage = document.createElement("h1");
switchView.append(switchMessage);

function startDrawingTurn() {
  showView(drawView);
  commands.splice(0, commands.length);
  redoStack.splice(0, redoStack.length);
  commands.push(new CircleCommand());
  redraw();

  selectTool(thinMarker, "marker", 2);
  selectColor(blackColor, "#000000");
  thicknessSlider.value = "10";
  customColorPicker.value = "#000000";
  customColorBtn.style.color = customColorPicker.value;

  let timeRemaining = DRAW_TIME;
  timerDisplay.textContent = similarities !== null
    ? `Round ${currentRound} | Player ${currentPlayer}/${totalPlayers} - Draw: ${currentPrompt} (${timeRemaining}s). There were ${similarities} similarities last round.`
    : `Round ${currentRound} | Player ${currentPlayer}/${totalPlayers} - Draw: ${currentPrompt} (${timeRemaining}s)`;
  const drawTimer = setInterval(() => {
    timeRemaining--;
    timerDisplay.textContent = similarities !== null
      ? `Round ${currentRound} | Player ${currentPlayer}/${totalPlayers} - Draw: ${currentPrompt} (${timeRemaining}s). There were ${similarities} similarities last round.`
      : `Round ${currentRound} | Player ${currentPlayer}/${totalPlayers} - Draw: ${currentPrompt} (${timeRemaining}s)`;
    if (timeRemaining <= 0) {
      clearInterval(drawTimer);
      endDrawingTurn();
    }
  }, 1000);
}

function endDrawingTurn() {
  playerDrawings.push([...commands]);
  if (currentPlayer < totalPlayers) {
    currentPlayer++;
    startPlayerSwitchTimer();
  } else {
    startJudgeSwitchTimer();
  }
}

function startPlayerSwitchTimer() {
  showView(switchView);
  let switchTime = SWITCH_TIME;
  switchMessage.textContent =
    `Player ${currentPlayer} drawing in ${switchTime}s`;
  const switchTimer = setInterval(() => {
    switchTime--;
    switchMessage.textContent =
      `Player ${currentPlayer} drawing in ${switchTime}s`;
    if (switchTime <= 0) {
      clearInterval(switchTimer);
      startDrawingTurn();
    }
  }, 1000);
}

function startJudgeSwitchTimer() {
  showView(switchView);
  let switchTime = SWITCH_TIME;
  switchMessage.textContent = `Judge judging in ${switchTime}s`;
  const switchTimer = setInterval(() => {
    switchTime--;
    switchMessage.textContent = `Judge judging in ${switchTime}s`;
    if (switchTime <= 0) {
      clearInterval(switchTimer);
      startJudgingPhase();
    }
  }, 1000);
}

// judging view
const galleryDiv = document.createElement("div");
const judgePrompt = document.createElement("h3");
judgePrompt.textContent = "Are all the drawings the same?";

const matchButton = document.createElement("button");
matchButton.textContent = "Yes";
const noMatchButton = document.createElement("button");
noMatchButton.textContent = "No";
judgeView.append(galleryDiv, judgePrompt, matchButton, noMatchButton);

function startJudgingPhase() {
  showView(judgeView);
  galleryDiv.innerHTML = "";

  playerDrawings.forEach((playerCommands, index) => {
    const miniCanvas = document.createElement("canvas");
    miniCanvas.width = 256;
    miniCanvas.height = 256;
    miniCanvas.style.border = "1px solid black";
    miniCanvas.style.margin = "10px";

    const miniCtx = miniCanvas.getContext("2d")!;
    miniCtx.scale(0.5, 0.5);
    for (const cmd of playerCommands) {
      cmd.draw(miniCtx);
    }
    const label = document.createElement("p");
    label.textContent = `Player ${index + 1}`;
    const wrapper = document.createElement("div");
    wrapper.style.display = "inline-block";
    wrapper.append(label, miniCanvas);
    galleryDiv.append(wrapper);
  });
}

matchButton.addEventListener("click", () => {
  showView(setupView);
});

noMatchButton.addEventListener("click", () => {
  if (testMode === "original"){
  similarities = parseInt(prompt("How many similarities are there?")!);
  while (Number.isNaN(similarities)) {
    similarities = parseInt(prompt("How many similarities are there?")!);
  }
}
  currentPlayer = 1;
  currentRound++;
  playerDrawings = [];
  startDrawingTurn();
//}else{
  //where category code will go

//}
});
