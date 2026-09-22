const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const renderDir = path.join(__dirname, "renders");

if (!fs.existsSync(renderDir)) {
  fs.mkdirSync(renderDir, { recursive: true });
}

const jobs = new Map();

function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { maxBuffer: 20 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }

        resolve({ stdout, stderr });
      }
    );
  });
}

function updateJob(id, data) {
  const job = jobs.get(id);

  if (!job) return;

  jobs.set(id, {
    ...job,
    ...data,
    updatedAt: new Date().toISOString()
  });
}

async function renderVideo(id, script, language) {
  const jobFolder = path.join(renderDir, id);

  fs.mkdirSync(jobFolder, { recursive: true });

  try {
    updateJob(id, {
      status: "preparing",
      progress: 5,
      message: "Preparing video..."
    });

    const clips = [];

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];

      updateJob(id, {
        status: "rendering",
        progress: 10 + Math.round((i / script.scenes.length) * 70),
        message: `Rendering scene ${i + 1} of ${script.scenes.length}...`
      });

      const sceneNumber = String(
        scene.sceneNumber || i + 1
      ).padStart(2, "0");

      const audioPath = path.join(
        jobFolder,
        `${sceneNumber}.wav`
      );

      const videoPath = path.join(
        jobFolder,
        `${sceneNumber}.mp4`
      );

      const textPath = path.join(
        jobFolder,
        `${sceneNumber}.txt`
      );

      const text = [
        scene.title || "",
        "",
        ...(scene.onScreenText || []),
        "",
        scene.visualPrompt || ""
      ].join("\n");

      fs.writeFileSync(textPath, text, "utf8");

      const voice = language === "bn" ? "bn" : "en-us";

      await run("espeak-ng", [
        "-v",
        voice,
        "-s",
        "145",
        "-w",
        audioPath,
        scene.narration || ""
      ]);

      const duration = Number(
        scene.durationSeconds || 10
      );

      await run("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=0x403a5b:s=1280x720:r=30:d=${duration}`,
        "-i",
        audioPath,
        "-vf",
        `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=${textPath}:fontcolor=white:fontsize=38:line_spacing=14:x=70:y=65`,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-af",
        "apad",
        "-t",
        String(duration),
        videoPath
      ]);

      clips.push(videoPath);
    }

    updateJob(id, {
      status: "rendering",
      progress: 85,
      message: "Joining scenes..."
    });

    const concatFile = path.join(
      jobFolder,
      "concat.txt"
    );

    const outputPath = path.join(
      jobFolder,
      "lesson.mp4"
    );

    const concatContent = clips
      .map(file => `file '${file.replaceAll("'", "'\\''")}'`)
      .join("\n");

    fs.writeFileSync(
      concatFile,
      concatContent
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
      message: "Your MP4 is ready.",
      downloadUrl: `/api/video-renders/${id}/download`
    });

  } catch (error) {
    console.error(error);

    updateJob(id, {
      status: "failed",
      progress: 100,
      message: "Video rendering failed.",
      error: error.message
    });
  }
}

app.get("/", (req, res) => {
  res.json({
    name: "AI Educational Video Render Server",
    status: "running"
  });
});

app.post("/api/video-renders", (req, res) => {
  const {
    script,
    language = "en"
  } = req.body;

  if (!script || !Array.isArray(script.scenes)) {
    return res.status(400).json({
      error: "A valid video script with scenes is required."
    });
  }

  const id = crypto.randomUUID();

  const job = {
    renderId: id,
    status: "preparing",
    progress: 0,
    message: "Render job queued.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobs.set(id, job);

  renderVideo(
    id,
    script,
    language
  );

  res.status(202).json(job);
});

app.get("/api/video-renders/:id", (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({
      error: "Render job not found."
    });
  }

  res.json(job);
});

app.get(
  "/api/video-renders/:id/download",
  (req, res) => {
    const job = jobs.get(req.params.id);

    if (!job) {
      return res
        .status(404)
        .send("Render job not found.");
    }

    if (job.status !== "completed") {
      return res
        .status(409)
        .send("Video is not ready yet.");
    }

    const filePath = path.join(
      renderDir,
      req.params.id,
      "lesson.mp4"
    );

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .send("MP4 file not found.");
    }

    res.download(
      filePath,
      `lesson-${req.params.id}.mp4`
    );
  }
);

app.listen(PORT, () => {
  console.log(
    `Video Render Server running on port ${PORT}`
  );
});
