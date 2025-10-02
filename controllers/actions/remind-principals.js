import { sendRemindersForPendingSubmissions } from "../periods/reminders.js";

sendRemindersForPendingSubmissions().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error("Error sending reminders");
    process.exit(1);
});
