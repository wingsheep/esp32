import { SerialPort } from "serialport";
import fs from "node:fs";

const config = JSON.parse(
  fs.readFileSync(
    new URL("./wled-config.json", import.meta.url),
    "utf8"
  )
);

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

  setTimeout(() => {
    port.write(`${JSON.stringify({ on: false })}\n`, writeErr => {
      if (writeErr) {
        console.error(writeErr);
        process.exit(1);
      }

      port.drain(drainErr => {
        if (drainErr) {
          console.error(drainErr);
          process.exit(1);
        }

        port.close(() => process.exit(0));
      });
    });
  }, 1200);
});
