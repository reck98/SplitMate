import app from "./app.js";
import { config } from "./utils/config.js";

app.listen(config.port, () => {
  console.log(`SplitMate backend running on port ${config.port}`);
});
