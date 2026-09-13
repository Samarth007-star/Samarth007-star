const fs = require("fs");
const path = require("path");

const username = process.env.GITHUB_USERNAME;
const token = process.env.GITHUB_TOKEN;

const COLORS = {
  0: "#161B22",
  1: "#0E4429",
  2: "#006D32",
  3: "#26A641",
  4: "#39D353"
};

const WIDTH = 53;
const HEIGHT = 7;

const CELL = 18;
const GAP = 5;
const RADIUS = 4;

const PADDING_X = 20;
const PADDING_Y = 25;

const STEP_X = CELL + GAP;
const STEP_Y = CELL + GAP;

const SVG_WIDTH =
  PADDING_X * 2 + WIDTH * CELL + (WIDTH - 1) * GAP;

const SVG_HEIGHT =
  PADDING_Y * 2 + HEIGHT * CELL + (HEIGHT - 1) * GAP;

const DURATION = 55;
const SNAKE_LENGTH = 7;

async function getContributions() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Samarth007-star-contribution-snake"
    },
    body: JSON.stringify({
      query,
      variables: {
        login: username
      }
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data.data.user.contributionsCollection.contributionCalendar.weeks;
}

function levelFromContribution(level) {
  switch (level) {
    case "NONE":
      return 0;
    case "FIRST_QUARTILE":
      return 1;
    case "SECOND_QUARTILE":
      return 2;
    case "THIRD_QUARTILE":
      return 3;
    case "FOURTH_QUARTILE":
      return 4;
    default:
      return 0;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createGrid(weeks) {
  const cells = [];

  for (let x = 0; x < Math.min(weeks.length, WIDTH); x++) {
    const days = weeks[x].contributionDays;

    for (let y = 0; y < HEIGHT; y++) {
      const day = days[y];

      if (!day) {
        cells.push({
          x,
          y,
          level: 0
        });
        continue;
      }

      cells.push({
        x,
        y,
        level: levelFromContribution(day.contributionLevel)
      });
    }
  }

  return cells;
}

function point(x, y) {
  return {
    x: PADDING_X + x * STEP_X + CELL / 2,
    y: PADDING_Y + y * STEP_Y + CELL / 2
  };
}

function createSnakePath() {
  const points = [];

  for (let x = 0; x < WIDTH; x++) {
    if (x % 2 === 0) {
      for (let y = 0; y < HEIGHT; y++) {
        points.push(point(x, y));
      }
    } else {
      for (let y = HEIGHT - 1; y >= 0; y--) {
        points.push(point(x, y));
      }
    }
  }

  return points;
}

function createPath(points) {
  return points
    .map((p, index) =>
      `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`
    )
    .join(" ");
}

function generateSvg(cells, points) {
  const snakePath = createPath(points);

  const stepTime = DURATION / (points.length - 1);

  let gridSvg = "";

  for (const cell of cells) {
    const x =
      PADDING_X +
      cell.x * STEP_X;

    const y =
      PADDING_Y +
      cell.y * STEP_Y;

    const color = COLORS[cell.level];

    const shouldEat =
      cell.level === 3 ||
      cell.level === 4;

    const snakeIndex = points.findIndex(
      p => Math.abs(p.x - (x + CELL / 2)) < 0.1 &&
           Math.abs(p.y - (y + CELL / 2)) < 0.1
    );

    if (shouldEat && snakeIndex >= 0) {
      const eatTime =
        (snakeIndex * stepTime) / DURATION;

      const disappearTime =
        Math.min(eatTime + 0.008, 0.999);

      gridSvg += `
        <rect
          x="${x}"
          y="${y}"
          width="${CELL}"
          height="${CELL}"
          rx="${RADIUS}"
          fill="${color}"
        >
          <animate
            attributeName="opacity"
            values="1;1;0;0"
            keyTimes="0;${eatTime.toFixed(6)};${disappearTime.toFixed(6)};1"
            dur="${DURATION}s"
            repeatCount="indefinite"
          />
        </rect>
      `;
    } else {
      gridSvg += `
        <rect
          x="${x}"
          y="${y}"
          width="${CELL}"
          height="${CELL}"
          rx="${RADIUS}"
          fill="${color}"
        />
      `;
    }
  }

  let snakeSvg = "";

  for (let i = SNAKE_LENGTH - 1; i >= 0; i--) {
    const delay =
      -(i * 0.22);

    const radius =
      i === 0 ? 6.5 : 5.2;

    const opacity =
      i === 0 ? 1 : Math.max(0.25, 1 - i * 0.11);

    snakeSvg += `
      <circle
        r="${radius}"
        fill="#39D353"
        opacity="${opacity}"
      >
        <animateMotion
          dur="${DURATION}s"
          begin="${delay}s"
          repeatCount="indefinite"
          rotate="auto"
          path="${snakePath}"
        />
      </circle>
    `;
  }

  const head = `
    <circle
      r="7"
      fill="#39D353"
    >
      <animateMotion
        dur="${DURATION}s"
        repeatCount="indefinite"
        rotate="auto"
        path="${snakePath}"
      />
    </circle>
  `;

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${SVG_WIDTH}"
  height="${SVG_HEIGHT}"
  viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}"
  role="img"
  aria-label="GitHub contribution journey"
>
  <rect
    width="100%"
    height="100%"
    fill="#0D1117"
    rx="10"
  />

  <g>
    ${gridSvg}
  </g>

  <g>
    ${snakeSvg}
    ${head}
  </g>
</svg>
`;
}

async function main() {
  if (!username) {
    throw new Error("GITHUB_USERNAME is missing");
  }

  if (!token) {
    throw new Error("GITHUB_TOKEN is missing");
  }

  console.log(`Generating contribution journey for ${username}`);

  const weeks = await getContributions();

  const cells = createGrid(weeks);

  const points = createSnakePath();

  const svg = generateSvg(cells, points);

  fs.mkdirSync(path.join(process.cwd(), "dist"), {
    recursive: true
  });

  fs.writeFileSync(
    path.join(process.cwd(), "dist", "github-contribution-grid-snake-dark.svg"),
    svg
  );

  console.log("Contribution journey generated successfully.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
