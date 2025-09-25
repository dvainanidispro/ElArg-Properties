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
        property_type: DataTypes.STRING, // 'property' ή 'canteen'
        start_date: DataTypes.DATEONLY,
        end_date: DataTypes.DATEONLY,
        submission_deadline: DataTypes.DATEONLY,
        active: DataTypes.BOOLEAN,
        status: {
            type: DataTypes.VIRTUAL,
            get() {
                const today = new Date();
                const endDate = new Date(this.end_date);
                const submission_deadline = new Date(this.submission_deadline);
                if (this.active) {
                    if (today < endDate) {
                        return 'planned'; // προγραμματισμένη
                    } else if (today >= endDate && today <= submission_deadline) {
                        return 'open'; // ανοιχτή
                    } else if (today > submission_deadline) {
                        return 'closed'; // κλειστή
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