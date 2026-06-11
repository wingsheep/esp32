import { SerialPort } from 'serialport'

const port = new SerialPort({
  path: '/dev/cu.usbserial-0001',
  baudRate: 115200,
})

port.write(
  JSON.stringify({
    on: true,
    bri: 255,
    seg: [
      {
        col: [[255, 0, 0]],
      },
    ],
  }) + '\n'
)
