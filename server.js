const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFile } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

const SERVER_URL =
  "https://video-render-server-mclh.onrender.com";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const renderDir = path.join(__dirname, "renders");

if (!fs.existsSync(renderDir)) {
  fs.mkdirSync(renderDir, { recursive: true });
}

const jobs = new Map();

/* =========================================================
   COMMAND RUNNER
========================================================= */

function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        maxBuffer: 50 * 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr ||
              stdout ||
              error.message
            )
          );
          return;
        }

        resolve({
          stdout,
          stderr
        });
      }
    );
  });
}

/* =========================================================
   JOB UPDATE
========================================================= */

function updateJob(id, data) {
  const job = jobs.get(id);

  if (!job) return;

  jobs.set(id, {
    ...job,
    ...data,
    updatedAt:
      new Date().toISOString()
  });
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function safeText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/;/g, "\\;");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\n/g, " ")
    .trim();
}

/* =========================================================
   DETECT VISUAL TYPE
========================================================= */

function getVisualType(topic) {
  const text =
    String(topic || "").toLowerCase();

  if (
    text.includes("photosynthesis") ||
    text.includes("plant") ||
    text.includes("chlorophyll") ||
    text.includes("leaf")
  ) {
    return "photosynthesis";
  }

  if (
    text.includes("solar") ||
    text.includes("sun") ||
    text.includes("energy")
  ) {
    return "energy";
  }

  if (
    text.includes("water") ||
    text.includes("water cycle")
  ) {
    return "water";
  }

  if (
    text.includes("atom") ||
    text.includes("molecule") ||
    text.includes("chemistry")
  ) {
    return "chemistry";
  }

  if (
    text.includes("cell") ||
    text.includes("biology")
  ) {
    return "biology";
  }

  if (
    text.includes("history") ||
    text.includes("war") ||
    text.includes("revolution") ||
    text.includes("empire")
  ) {
    return "history";
  }

  if (
    text.includes("math") ||
    text.includes("equation") ||
    text.includes("number") ||
    text.includes("percentage") ||
    text.includes("profit") ||
    text.includes("loss")
  ) {
    return "math";
  }

  return "general";
}

/* =========================================================
   VISUAL FILTER
   Creates educational diagrams using FFmpeg shapes.
========================================================= */

function getVisualFilter(
  visualType,
  scene,
  duration
) {
  const title =
    safeText(cleanText(scene.title));

  const topicText =
    safeText(
      cleanText(
        scene.onScreenText?.[0] ||
        scene.title ||
        "Educational Lesson"
      )
    );

  const base =
    "drawbox=x=0:y=0:w=1280:h=720:color=0x0f172a@1:t=fill";

  const top =
    "drawbox=x=0:y=0:w=1280:h=95:color=0x312e81@1:t=fill";

  const titleText =
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${title}':fontcolor=white:fontsize=40:x=55:y=28`;

  const topicLabel =
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${topicText}':fontcolor=white:fontsize=30:x=55:y=610`;

  /* -------------------------------------------------------
     PHOTOSYNTHESIS
  ------------------------------------------------------- */

  if (visualType === "photosynthesis") {

    return [
      base,
      top,

      titleText,

      // Sun
      "drawbox=x=920:y=145:w=150:h=150:color=0xfacc15@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='SUNLIGHT':fontcolor=0x422006:fontsize=25:x=938:y=205",

      // Plant stem
      "drawbox=x=570:y=310:w=35:h=240:color=0x166534@1:t=fill",

      // Leaf 1
      "drawbox=x=400:y=320:w=180:h=70:color=0x22c55e@1:t=fill",

      // Leaf 2
      "drawbox=x=605:y=390:w=180:h=70:color=0x16a34a@1:t=fill",

      // Ground
      "drawbox=x=300:y=545:w=700:h=20:color=0x92400e@1:t=fill",

      // Water
      "drawbox=x=280:y=590:w=180:h=65:color=0x0ea5e9@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='WATER':fontcolor=white:fontsize=25:x=320:y=610",

      // CO2
      "drawbox=x=60:y=300:w=180:h=65:color=0x475569@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='CO2':fontcolor=white:fontsize=30:x=125:y=318",

      // Oxygen
      "drawbox=x=940:y=400:w=180:h=65:color=0x06b6d4@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='OXYGEN':fontcolor=white:fontsize=24:x=970:y=420",

      // Glucose
      "drawbox=x=800:y=520:w=220:h=65:color=0xf59e0b@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='FOOD / GLUCOSE':fontcolor=0x451a03:fontsize=20:x=820:y=542",

      topicLabel
    ].join(",");
  }

  /* -------------------------------------------------------
     WATER
  ------------------------------------------------------- */

  if (visualType === "water") {

    return [
      base,
      top,
      titleText,

      "drawbox=x=70:y=430:w=1140:h=120:color=0x0284c7@1:t=fill",

      "drawbox=x=470:y=170:w=320:h=100:color=0x38bdf8@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='EVAPORATION':fontcolor=white:fontsize=27:x=485:y=205",

      "drawbox=x=490:y=310:w=280:h=80:color=0x64748b@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='CLOUDS':fontcolor=white:fontsize=30:x=570:y=335",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='PRECIPITATION':fontcolor=white:fontsize=25:x=480:y=420",

      topicLabel
    ].join(",");
  }

  /* -------------------------------------------------------
     CHEMISTRY
  ------------------------------------------------------- */

  if (visualType === "chemistry") {

    return [
      base,
      top,
      titleText,

      "drawbox=x=300:y=250:w=180:h=180:color=0xef4444@1:t=fill",

      "drawbox=x=800:y=250:w=180:h=180:color=0x3b82f6@1:t=fill",

      "drawbox=x=540:y=290:w=200:h=100:color=0xf59e0b@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='ATOM':fontcolor=white:fontsize=35:x=355:y=320",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='ATOM':fontcolor=white:fontsize=35:x=855:y=320",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='MOLECULE':fontcolor=0x451a03:fontsize=28:x=565:y=325",

      topicLabel
    ].join(",");
  }

  /* -------------------------------------------------------
     BIOLOGY
  ------------------------------------------------------- */

  if (visualType === "biology") {

    return [
      base,
      top,
      titleText,

      "drawbox=x=390:y=180:w=500:h=330:color=0x16a34a@1:t=fill",

      "drawbox=x=470:y=250:w=340:h=190:color=0x86efac@1:t=fill",

      "drawbox=x=550:y=295:w=180:h=100:color=0xfde047@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='CELL':fontcolor=white:fontsize=42:x=610:y=215",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='NUCLEUS':fontcolor=0x422006:fontsize=27:x=585:y=330",

      topicLabel
    ].join(",");
  }

  /* -------------------------------------------------------
     ENERGY
  ------------------------------------------------------- */

  if (visualType === "energy") {

    return [
      base,
      top,
      titleText,

      "drawbox=x=90:y=270:w=230:h=130:color=0xfacc15@1:t=fill",

      "drawbox=x=520:y=270:w=230:h=130:color=0xf97316@1:t=fill",

      "drawbox=x=950:y=270:w=230:h=130:color=0x22c55e@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='SOURCE':fontcolor=0x422006:fontsize=32:x=145:y=315",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='TRANSFER':fontcolor=white:fontsize=30:x=555:y=315",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='USEFUL':fontcolor=white:fontsize=32:x=1010:y=315",

      topicLabel
    ].join(",");
  }

  /* -------------------------------------------------------
     MATH
  ------------------------------------------------------- */

  if (visualType === "math") {

    return [
      base,
      top,
      titleText,

      "drawbox=x=160:y=220:w=250:h=250:color=0x7c3aed@1:t=fill",

      "drawbox=x=515:y=220:w=250:h=250:color=0x0891b2@1:t=fill",

      "drawbox=x=870:y=220:w=250:h=250:color=0x16a34a@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='STEP 1':fontcolor=white:fontsize=35:x=225:y=320",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='STEP 2':fontcolor=white:fontsize=35:x=580:y=320",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='ANSWER':fontcolor=white:fontsize=35:x=920:y=320",

      topicLabel
    ].join(",");
  }

  /* -------------------------------------------------------
     HISTORY
  ------------------------------------------------------- */

  if (visualType === "history") {

    return [
      base,
      top,
      titleText,

      "drawbox=x=120:y=350:w=1040:h=12:color=0xf59e0b@1:t=fill",

      "drawbox=x=180:y=310:w=80:h=90:color=0xef4444@1:t=fill",

      "drawbox=x=500:y=310:w=80:h=90:color=0x8b5cf6@1:t=fill",

      "drawbox=x=820:y=310:w=80:h=90:color=0x22c55e@1:t=fill",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='EVENT 1':fontcolor=white:fontsize=24:x=155:y=430",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='EVENT 2':fontcolor=white:fontsize=24:x=475:y=430",

      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='EVENT 3':fontcolor=white:fontsize=24:x=795:y=430",

      topicLabel
    ].join(",");
  }

  /* -------------------------------------------------------
     GENERAL EDUCATIONAL VISUAL
  ------------------------------------------------------- */

  return [
    base,
    top,
    titleText,

    "drawbox=x=100:y=190:w=300:h=300:color=0x7c3aed@1:t=fill",

    "drawbox=x=490:y=190:w=300:h=300:color=0x0891b2@1:t=fill",

    "drawbox=x=880:y=190:w=300:h=300:color=0x16a34a@1:t=fill",

    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='LEARN':fontcolor=white:fontsize=40:x=185:y=315",

    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='THINK':fontcolor=white:fontsize=40:x=570:y=315",

    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='CREATE':fontcolor=white:fontsize=40:x=945:y=315",

    topicLabel
  ].join(",");
}

/* =========================================================
   RENDER VIDEO
========================================================= */

async function renderVideo(
  id,
  script,
  language
) {
  const jobFolder =
    path.join(renderDir, id);

  fs.mkdirSync(jobFolder, {
    recursive: true
  });

  try {

    updateJob(id, {
      status: "preparing",
      progress: 5,
      message:
        "Preparing educational video..."
    });

    const clips = [];

    const scenes =
      Array.isArray(script.scenes)
        ? script.scenes
        : [];

    const visualType =
      getVisualType(
        script.title ||
        script.topic ||
        scenes[0]?.title ||
        ""
      );

    for (
      let i = 0;
      i < scenes.length;
      i++
    ) {

      const scene =
        scenes[i];

      const sceneNumber =
        String(
          scene.sceneNumber ||
          i + 1
        ).padStart(2, "0");

      updateJob(id, {
        status: "rendering",
        progress:
          10 +
          Math.round(
            (i / scenes.length) * 70
          ),
        message:
          `Creating visual scene ${i + 1} of ${scenes.length}...`
      });

      const audioPath =
        path.join(
          jobFolder,
          `${sceneNumber}.wav`
        );

      const videoPath =
        path.join(
          jobFolder,
          `${sceneNumber}.mp4`
        );

      const voice =
        language === "bn"
          ? "bn"
          : "en-us";

      const narration =
        cleanText(
          scene.narration ||
          scene.voiceover ||
          scene.title ||
          ""
        );

      await run("espeak-ng", [
        "-v",
        voice,
        "-s",
        "145",
        "-w",
        audioPath,
        narration
      ]);

      let duration =
        Number(
          scene.durationSeconds
        );

      if (
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        duration = 10;
      }

      duration =
        Math.max(
          5,
          Math.min(
            duration,
            30
          )
        );

      const filter =
        getVisualFilter(
          visualType,
          scene,
          duration
        );

      await run("ffmpeg", [
        "-y",

        "-f",
        "lavfi",

        "-i",
        `color=c=0x0f172a:s=1280x720:r=30:d=${duration}`,

        "-i",
        audioPath,

        "-vf",
        filter,

        "-map",
        "0:v:0",

        "-map",
        "1:a:0",

        "-c:v",
        "libx264",

        "-preset",
        "veryfast",

        "-crf",
        "23",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-af",
        "apad",

        "-t",
        String(duration),

        "-movflags",
        "+faststart",

        videoPath
      ]);

      clips.push(videoPath);
    }

    updateJob(id, {
      status: "rendering",
      progress: 85,
      message:
        "Joining educational scenes..."
    });

    const concatFile =
      path.join(
        jobFolder,
        "concat.txt"
      );

    const outputPath =
      path.join(
        jobFolder,
        "lesson.mp4"
      );

    const concatContent =
      clips
        .map(
          file =>
            `file '${file.replaceAll(
              "'",
              "'\\''"
            )}'`
        )
        .join("\n");

    fs.writeFileSync(
      concatFile,
      concatContent,
      "utf8"
    );

    await run("ffmpeg", [
      "-y",

      "-f",
      "concat",

      "-safe",
      "0",

      "-i",
      concatFile,

      "-c",
      "copy",

      "-movflags",
      "+faststart",

      outputPath
    ]);

    updateJob(id, {
      status: "completed",
      progress: 100,
      message:
        "Your educational MP4 is ready.",
      downloadUrl:
        `${SERVER_URL}/api/video-renders/${id}/download`
    });

  } catch (error) {

    console.error(
      "VIDEO RENDER ERROR:",
      error
    );

    updateJob(id, {
      status: "failed",
      progress: 100,
      message:
        "Video rendering failed.",
      error:
        error instanceof Error
          ? error.message
          : "Unknown rendering error."
    });
  }
}

/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

  res.json({
    name:
      "AI Educational Video Render Server",

    status:
      "running",

    version:
      "2.0",

    features: [
      "Educational visual diagrams",
      "Scene rendering",
      "Text overlays",
      "Voice narration",
      "MP4 rendering"
    ]
  });
});

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/healthz",
  (req, res) => {

    res.json({
      status: "ok"
    });

  }
);

/* =========================================================
   CREATE RENDER
========================================================= */

app.post(
  "/api/video-renders",
  (req, res) => {

    const {
      script,
      language = "en"
    } = req.body;

    if (
      !script ||
      !Array.isArray(
        script.scenes
      )
    ) {

      return res
        .status(400)
        .json({
          error:
            "A valid video script with scenes is required."
        });

    }

    if (
      script.scenes.length === 0
    ) {

      return res
        .status(400)
        .json({
          error:
            "At least one scene is required."
        });

    }

    const id =
      crypto.randomUUID();

    const now =
      new Date().toISOString();

    const job = {

      renderId:
        id,

      scriptId:
        script.id || null,

      status:
        "preparing",

      progress:
        0,

      message:
        "Render job queued.",

      createdAt:
        now,

      updatedAt:
        now
    };

    jobs.set(
      id,
      job
    );

    renderVideo(
      id,
      script,
      language
    );

    res
      .status(202)
      .json(job);
  }
);

/* =========================================================
   GET RENDER STATUS
========================================================= */

app.get(
  "/api/video-renders/:id",
  (req, res) => {

    const job =
      jobs.get(
        req.params.id
      );

    if (!job) {

      return res
        .status(404)
        .json({
          error:
            "Render job not found."
        });

    }

    res.json(job);
  }
);

/* =========================================================
   DOWNLOAD MP4
========================================================= */

app.get(
  "/api/video-renders/:id/download",
  (req, res) => {

    const job =
      jobs.get(
        req.params.id
      );

    if (!job) {

      return res
        .status(404)
        .send(
          "Render job not found."
        );

    }

    if (
      job.status !==
      "completed"
    ) {

      return res
        .status(409)
        .send(
          "Video is not ready yet."
        );

    }

    const filePath =
      path.join(
        renderDir,
        req.params.id,
        "lesson.mp4"
      );

    if (
      !fs.existsSync(
        filePath
      )
    ) {

      return res
        .status(404)
        .send(
          "MP4 file not found."
        );

    }

    res.download(
      filePath,
      `lesson-${req.params.id}.mp4`
    );
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {

    console.log(
      `Video Render Server running on port ${PORT}`
    );

  }
);
