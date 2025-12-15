import { getActiveCanteenPeriod } from "./periods.js";

let activePeriod = await getActiveCanteenPeriod();
// let activePeriod = await getActiveCanteenPeriod(true);
console.log(activePeriod ? activePeriod.toJSON() : null);

process.exit(0);



// run:
// node --env-file=.env controllers/periods/test-active.js
