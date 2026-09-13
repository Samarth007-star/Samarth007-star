const fs = require("fs");
const path = require("path");

const WIDTH = 53;
const HEIGHT = 7;

const CELL = 15;
const GAP = 5;

const PADDING_X = 10;
const PADDING_Y = 30;

const STEP_X = CELL + GAP;
const STEP_Y = CELL + GAP;

const SVG_WIDTH =
  PADDING_X * 2 +
  WIDTH * CELL +
  (WIDTH - 1) * GAP;

const SVG_HEIGHT =
  PADDING_Y * 2 +
  HEIGHT * CELL +
  (HEIGHT - 1) * GAP;

const COLORS = [
  "#161B22",
  "#0E4429",
  "#006D32",
  "#26A641",
  "#39D353"
];

const GREEN_PROBABILITY = 0.90;

const ANIMATION_DURATION = 45;

const SNAKE_COLOR = "#39D353";

function random(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateGrid() {
  const grid = [];

  let seed = 20260913;

  for (let x = 0; x < WIDTH; x++) {
    const column = [];

    for (let y = 0; y < HEIGHT; y++) {
      const r = random(seed++);

      if (r > GREEN_PROBABILITY) {
        column.push(0);
        continue;
      }

      const intensity = random(seed++);

      let level;

      if (intensity < 0.20) {
        level = 1;
      } else if (intensity < 0.45) {
        level = 2;
      } else if (intensity < 0.75) {
        level = 3;
      } else {
        level = 4;
      }

      column.push(level);
    }

    grid.push(column);
  }

  return grid;
}

function point(x, y) {
  return {
    x: PADDING_X + x * STEP_X + CELL / 2,
    y: PADDING_Y + y * STEP_Y + CELL / 2
  };
}

function generateSnakePath(grid) {
  const path = [];

  for (let x = 0; x < WIDTH; x++) {
    if (x % 2 === 0) {
      for (let y = 0; y < HEIGHT; y++) {
        path.push({
          x,
          y
        });
      }
    } else {
      for (let y = HEIGHT - 1; y >= 0; y--) {
        path.push({
          x,
          y
        });
      }
    }
  }

  return path;
}

function pathToSvg(points) {
  return points
    .map((p, i) => {
      const pos = point(p.x, p.y);

      return `${i === 0 ? "M" : "L"} ${pos.x} ${pos.y}`;
    })
    .join(" ");
}

function createGridSvg(grid, snakePath) {
  let output = "";

  const pathLength = snakePath.length;

  const cellIndex = new Map();

  snakePath.forEach((cell, index) => {
    cellIndex.set(`${cell.x}-${cell.y}`, index);
  });

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {

      const level = grid[x][y];

      const px =
        PADDING_X +
        x * STEP_X;

      const py =
        PADDING_Y +
        y * STEP_Y;

      const color = COLORS[level];

      const index =
        cellIndex.get(`${x}-${y}`);

      const start =
        index / pathLength;

      const end =
        Math.min(start + 0.025, 1);

      if (level === 0) {

        output += `
          <rect
            x="${px}"
            y="${py}"
            width="${CELL}"
            height="${CELL}"
            rx="3"
            fill="${color}"
          />
        `;

      } else {

        output += `
          <rect
            x="${px}"
            y="${py}"
            width="${CELL}"
            height="${CELL}"
            rx="3"
            fill="${color}"
          >
            <animate
              attributeName="opacity"
              values="1;1;0;0;1"
              keyTimes="${start.toFixed(5)};${start.toFixed(5)};${end.toFixed(5)};0.999;1"
              dur="${ANIMATION_DURATION}s"
              repeatCount="indefinite"
            />
          </rect>
        `;

      }
    }
  }

  return output;
}

function createSnakeSvg(snakePath) {

  const svgPath =
    pathToSvg(snakePath);

  let output = "";

  const snakeLength = 9;

  for (let i = snakeLength - 1; i >= 0; i--) {

    const delay =
      -(i * 0.18);

    const radius =
      i === 0
        ? 6
        : 4.5;

    const opacity =
      Math.max(
        0.25,
        1 - i * 0.09
      );

    output += `
      <circle
        r="${radius}"
        fill="${SNAKE_COLOR}"
        opacity="${opacity}"
      >
        <animateMotion
          dur="${ANIMATION_DURATION}s"
          begin="${delay}s"
          repeatCount="indefinite"
          rotate="auto"
          path="${svgPath}"
        />
      </circle>
    `;
  }

  return output;
}

function generateSvg() {

  const grid =
    generateGrid();

  const snakePath =
    generateSnakePath(grid);

  const gridSvg =
    createGridSvg(
      grid,
      snakePath
    );

  const snakeSvg =
    createSnakeSvg(
      snakePath
    );

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${SVG_WIDTH}"
  height="${SVG_HEIGHT}"
  viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}"
  role="img"
  aria-label="Contribution Journey"
>

  <rect
    width="100%"
    height="100%"
    fill="#0D1117"
  />

  <g>
    ${gridSvg}
  </g>

  <g>
    ${snakeSvg}
  </g>

</svg>
`;
}

function main() {

  const dist =
    path.join(
      process.cwd(),
      "dist"
    );

  fs.mkdirSync(
    dist,
    {
      recursive: true
    }
  );

  const svg =
    generateSvg();

  fs.writeFileSync(
    path.join(
      dist,
      "github-contribution-grid-snake-dark.svg"
    ),
    svg
  );

  console.log(
    "Contribution Journey generated."
  );

  console.log(
    "Green coverage: approximately 90%"
  );
}

main();
