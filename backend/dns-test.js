const dns = require("dns");

dns.resolveSrv(
  "_mongodb._tcp.invoice-generator.mtz3t1y.mongodb.net",
  (err, records) => {
    console.log("Error:", err);
    console.log("Records:", records);
  }
);