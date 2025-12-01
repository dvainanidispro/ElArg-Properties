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
                const today = process.env.FAKE_DATE ? new Date(process.env.FAKE_DATE) : new Date();
                const endDate = new Date(this.end_date);
                const submission_deadline = new Date(this.submission_deadline);
                if (this.active) {
                    if (today < endDate) {
                        return 'planned'; // προγραμματισμένη, δεν έχει φτάσει το end_date
                    } else if (today >= endDate && today <= submission_deadline) {
                        return 'open'; // ανοιχτή, μεταξύ end_date και submission_deadline
                    } else if (today > submission_deadline) {
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