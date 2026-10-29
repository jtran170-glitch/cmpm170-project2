const app = document.querySelector<HTMLElement>("#app")!;

const heading = document.createElement("h1");
heading.textContent = "D2 project";

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.border = "2px solid #000000";

const message = document.createElement("p");
message.textContent = "Your project starts here.";

app.append(heading, canvas, message);

const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  thickness: number;
}

let strokes: Stroke[] = [];
let currentStroke: Stroke | null = null;

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) {
    if (stroke.points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      const { x, y } = stroke.points[0];
      ctx.moveTo(x, y);
      for (const { x, y } of stroke.points) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  currentStroke = {
    points: [{ x: e.offsetX, y: e.offsetY }],
    color: "#000000",
    thickness: 1,
  };
  strokes.push(currentStroke);
  redraw();
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentStroke?.points.push({ x: e.offsetX, y: e.offsetY });
    redraw();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentStroke = null;
  redraw();
});

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  strokes = [];
  redraw();
});
