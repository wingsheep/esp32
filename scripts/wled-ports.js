import { SerialPort } from "serialport";

const list = await SerialPort.list();
console.table(
  list.map(p => ({
    path: p.path,
    manufacturer: p.manufacturer || "-",
    vendorId: p.vendorId || "-",
    productId: p.productId || "-",
  }))
);
