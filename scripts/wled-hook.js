import { SerialPort } from "serialport";
import fs from "node:fs";

const config = JSON.parse(
  fs.readFileSync(
    new URL("./wled-config.json", import.meta.url),
    "utf8"
  )
);

const action = process.argv[2];

const presetMap = {
  running: config.presets.running,
  success: config.presets.success,
  error: config.presets.error,
  review: config.presets.review,
  finish: config.presets.finish,
};

const preset = presetMap[action];

if (!preset) {
  process.exit(0);
}

const port = new SerialPort({
  path: config.port,
  baudRate: config.baudRate,
  autoOpen: false,
});

port.open(err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const payload = {
    ps: preset
  };

  port.write(JSON.stringify(payload));

  setTimeout(() => {
    port.close();
    process.exit(0);
  }, 200);
});
