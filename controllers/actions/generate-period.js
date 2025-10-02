import { generatePeriod } from "../periods/generate.js";

generatePeriod().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error("Error generating period");
    process.exit(1);
});

