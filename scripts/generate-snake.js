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

const EAT_LEVELS = new Set([3, 4]);

function random(seed) {
  const x = Math.sin(seed) * 10000;
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

      if (intensity < 0.25) {
        column.push(1);
      } else if (intensity < 0.50) {
        column.push(2);
      } else if (intensity < 0.78) {
        column.push(3);
      } else {
        column.push(4);
      }
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

function generateSnakePath() {
  const path = [];

  for (let x = 0; x < WIDTH; x++) {
    if (x % 2 === 0) {
      for (let y = 0; y < HEIGHT; y++) {
        path.push({ x, y });
      }
    } else {
      for (let y = HEIGHT - 1; y >= 0; y--) {
        path.push({ x, y });
      }
    }
  }

  return path;
}

function getAnimationValues(snakePath, axis) {
  return snakePath
    .map(cell => point(cell.x, cell.y)[axis])
    .join(";");
}

function getKeyTimes(length) {
  return snakePathKeyTimes(length);
}

function snakePathKeyTimes(length) {
  const values = [];

  for (let i = 0; i < length; i++) {
    values.push((i / (length - 1)).toFixed(6));
  }

  return values.join(";");
}

function createMovingSnake(snakePath) {
  const cxValues = getAnimationValues(
    snakePath,
    "x"
  );

  const cyValues = getAnimationValues(
    snakePath,
    "y"
  );

  const keyTimes = getKeyTimes(
    snakePath.length
  );

  let output = "";

  const snakeLength = 9;

  for (let i = snakeLength - 1; i >= 0; i--) {
    const delay = -(i * 0.16);

    const radius = i === 0 ? 6 : 4.5;

    const opacity = Math.max(
      0.25,
      1 - i * 0.09
    );

    output += `
      <circle
        cx="${point(
          snakePath[0].x,
          snakePath[0].y
        ).x}"
        cy="${point(
          snakePath[0].x,
          snakePath[0].y
        ).y}"
        r="${radius}"
        fill="${SNAKE_COLOR}"
        opacity="${opacity}"
      >

        <animate
          attributeName="cx"
          values="${cxValues}"
          keyTimes="${keyTimes}"
          dur="${ANIMATION_DURATION}s"
          begin="${delay}s"
          repeatCount="indefinite"
          calcMode="linear"
        />

        <animate
          attributeName="cy"
          values="${cyValues}"
          keyTimes="${keyTimes}"
          dur="${ANIMATION_DURATION}s"
          begin="${delay}s"
          repeatCount="indefinite"
          calcMode="linear"
        />

      </circle>
    `;
  }

  return output;
}

function createGridSvg(grid, snakePath) {
  let output = "";

  const pathLength = snakePath.length;

  const cellIndex = new Map();

  snakePath.forEach((cell, index) => {
    cellIndex.set(
      `${cell.x}-${cell.y}`,
      index
    );
  });

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      const level = grid[x][y];

      const px =
        PADDING_X + x * STEP_X;

      const py =
        PADDING_Y + y * STEP_Y;

      const color = COLORS[level];

      const index =
        cellIndex.get(`${x}-${y}`);

      if (!EAT_LEVELS.has(level)) {
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

        continue;
      }

      const eatStart =
        index / pathLength;

      const eatEnd =
        Math.min(
          eatStart + 0.008,
          0.999
        );

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
            keyTimes="
              0;
              ${eatStart.toFixed(6)};
              ${eatEnd.toFixed(6)};
              0.999;
              1
            "
            dur="${ANIMATION_DURATION}s"
            repeatCount="indefinite"
          />

        </rect>
      `;
    }
  }

  return output;
}

function generateSvg() {
  const grid =
    generateGrid();

  const snakePath =
    generateSnakePath();

  const gridSvg =
    createGridSvg(
      grid,
      snakePath
    );

  const snakeSvg =
    createMovingSnake(
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
    "Contribution Journey generated successfully."
  );

  console.log(
    "Green coverage: approximately 90%."
  );

  console.log(
    "Dark and medium green cells remain."
  );

  console.log(
    "Light green cells are eaten."
  );

  console.log(
    "Snake uses direct coordinate animation."
  );
}

main();
