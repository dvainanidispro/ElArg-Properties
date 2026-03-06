import { DataTypes } from 'sequelize';
import { db } from "../config/database.js"; 

const Period = db.define('period',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false
        },
        name: DataTypes.STRING,
        property_type: DataTypes.STRING, // 'property' ή 'canteen'
        start_date: DataTypes.DATEONLY,
        end_date: DataTypes.DATEONLY,
        submission_deadline: DataTypes.DATEONLY,
        active: DataTypes.BOOLEAN,
        canteens: {
            type: DataTypes.ARRAY(DataTypes.INTEGER),
            allowNull: true,
            defaultValue: [],
            comment: 'Array από canteen ids που συμμετέχουν στην περίοδο (ανεξάρτητα αν έχουν υποβάλει στοιχεία)'
        },
        status: {
            type: DataTypes.VIRTUAL,
            // Δυνατές τιμές για status: 'planned', 'open', 'closed' 'inactive'
            get() {
                // χρησιμοποιεί FAKE_DATE από .env (π.χ. "2025-12-31") αν υπάρχει, για testing
                const now = process.env.FAKE_DATE ? new Date(process.env.FAKE_DATE) : new Date();
                const endDate = new Date(this.end_date);
                // Το "πραγματικό deadline" είναι το submission_deadline, στις 24:00 το βράδυ, δηλαδή την επόμενη μέρα.
                const submission_deadline_plus1 = new Date(this.submission_deadline);
                submission_deadline_plus1.setDate(submission_deadline_plus1.getDate() + 1);
                if (this.active) {
                    if (now < endDate) {
                        return 'planned'; // προγραμματισμένη, δεν έχει φτάσει το end_date
                    } else if (now >= endDate && now < submission_deadline_plus1) {
                        return 'open'; // ανοιχτή, μεταξύ end_date και submission_deadline (συμπεριλαμβάνει submission_deadline)
                    } else if (now >= submission_deadline_plus1) {
                        return 'closed'; // κλειστή, έχει περάσει το submission_deadline
                    }
                }
                return 'inactive'; // ανενεργή
            },
        },
    },
    {
        tableName: 'periods',
        timestamps: true,
        indexes: [
            { 
                fields: ['code'],
                unique: true,
                name: 'periods_code'
            }
        ]
    }
);



export { Period };